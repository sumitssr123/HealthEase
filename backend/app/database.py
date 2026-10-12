import logging
from typing import Optional, Any, Dict, overload
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel
from pymongo.errors import DuplicateKeyError

from app.config import settings

logger = logging.getLogger("healthease.database")


class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_state = Database()


def get_database() -> AsyncIOMotorDatabase:
    """Return the active Motor database instance."""
    if db_state.db is None:
        raise RuntimeError("Database is not connected. Call connect_to_mongo() first.")
    return db_state.db


async def _connect_client(uri: str, db_name: str) -> bool:
    """Helper to initialize and ping a Motor client."""
    try:
        client_kwargs: Dict[str, Any] = {
            "serverSelectionTimeoutMS": 4000,
            "maxPoolSize": 50,
            "minPoolSize": 10,
        }
        if "mongodb+srv://" in uri or "ssl=true" in uri.lower():
            try:
                import certifi
                client_kwargs["tlsCAFile"] = certifi.where()
            except ImportError:
                pass

        client = AsyncIOMotorClient(uri, **client_kwargs)
        await client.admin.command("ping")
        db_state.client = client
        db_state.db = client[db_name]
        return True
    except Exception:
        return False


async def connect_to_mongo() -> None:
    """Initialize connection to MongoDB (Atlas or local) with automatic fallback and ensure indexes."""
    target_uri = settings.MONGODB_URI
    db_name = settings.MONGODB_DB
    sanitized_uri = target_uri.split("@")[-1] if "@" in target_uri else target_uri
    logger.info("Connecting to MongoDB at %s (DB: %s)...", sanitized_uri, db_name)

    connected = await _connect_client(target_uri, db_name)
    if not connected and target_uri != "mongodb://localhost:27017":
        logger.warning(
            "Primary MongoDB connection (%s) unavailable. Attempting local MongoDB fallback at mongodb://localhost:27017...",
            sanitized_uri,
        )
        connected = await _connect_client("mongodb://localhost:27017", db_name)
        if connected:
            logger.info("Connected to local MongoDB fallback at mongodb://localhost:27017 (DB: %s)", db_name)

    if connected:
        logger.info("Successfully connected to MongoDB!")
        await init_indexes()
        await bootstrap_admin()
    else:
        logger.warning("MongoDB initial connection error. Application will continue with reconnection capability.")


async def close_mongo_connection() -> None:
    """Close the MongoDB connection pool."""
    if db_state.client is not None:
        logger.info("Closing MongoDB connection...")
        db_state.client.close()
        db_state.client = None
        db_state.db = None
        logger.info("MongoDB connection closed.")


async def init_indexes() -> None:
    """Create all required production database indexes."""
    if db_state.db is None:
        return

    db = db_state.db
    # 1. Users collection
    try:
        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.users.create_index([("isAdmin", ASCENDING)])
        await db.users.create_index([("isDoctor", ASCENDING)])
    except Exception as e:
        logger.debug("Users indexes: %s", e)

    # 2. Doctors collection
    try:
        await db.doctors.create_index([("userId", ASCENDING)])
        await db.doctors.create_index([("status", ASCENDING)])
        await db.doctors.create_index([("specialization", ASCENDING)])
    except Exception as e:
        logger.debug("Doctors indexes: %s", e)

    # 3. Appointments collection - Double booking prevention
    try:
        await db.appointments.create_index([("userId", ASCENDING)])
        await db.appointments.create_index([("doctorId", ASCENDING), ("date", ASCENDING)])
        # MANDATORY REQUIREMENT: Database-enforced double booking prevention
        # Unique partial index on (doctorId, date, time) where status == "booked"
        await db.appointments.create_index(
            [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
            unique=True,
            partialFilterExpression={"status": "booked"},
            name="idx_appointments_double_booking_prevention",
        )
    except Exception as e:
        logger.debug("Appointments indexes: %s", e)

    # 4. In-App Notifications collection
    try:
        await db.notifications.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])
        await db.notifications.create_index([("read", ASCENDING)])
    except Exception as e:
        logger.debug("Notifications indexes: %s", e)

    # 5. Hospitals collection
    try:
        await db.hospitals.create_index([("name", ASCENDING)])
    except Exception as e:
        logger.debug("Hospitals indexes: %s", e)

    logger.info("MongoDB index verification finished.")


async def bootstrap_admin() -> None:
    """Ensure an administrator user exists on startup without requiring manual DB edits.
    Uses an idempotent upsert to prevent race conditions when multiple instances start concurrently.
    """
    if db_state.db is None or not settings.ADMIN_EMAIL:
        return

    try:
        from app.security import get_password_hash

        now = datetime.utcnow()
        result = await db_state.db.users.update_one(
            {"email": settings.ADMIN_EMAIL},
            {
                "$setOnInsert": {
                    "name": settings.ADMIN_NAME,
                    "password": get_password_hash(settings.ADMIN_PASSWORD),
                    "isDoctor": False,
                    "notification": [],
                    "seennotification": [],
                    "createdAt": now,
                },
                "$set": {
                    "isAdmin": True,
                    "role": "admin",
                    "updatedAt": now,
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            logger.info("Bootstrap: Created default administrator account (%s)", settings.ADMIN_EMAIL)
        else:
            logger.info("Bootstrap: Verified existing administrator account (%s)", settings.ADMIN_EMAIL)
    except DuplicateKeyError:
        logger.info("Bootstrap: Administrator account (%s) initialized concurrently by another instance", settings.ADMIN_EMAIL)
    except Exception as exc:
        logger.warning("Bootstrap admin check skipped: %s", exc)


@overload
def format_mongo_doc(doc: None) -> None:
    ...


@overload
def format_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    ...


def format_mongo_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Format MongoDB document into clean JSON-serializable dictionary."""
    if doc is None:
        return None

    cleaned: Dict[str, Any] = {}
    for k, v in doc.items():
        if k == "_id":
            cleaned["_id"] = str(v)
            cleaned["id"] = str(v)
        elif isinstance(v, ObjectId):
            cleaned[k] = str(v)
        elif isinstance(v, datetime):
            cleaned[k] = v.isoformat()
        elif isinstance(v, list):
            cleaned[k] = [format_mongo_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in v]
        elif isinstance(v, dict):
            cleaned[k] = format_mongo_doc(v)
        else:
            cleaned[k] = v
    return cleaned
