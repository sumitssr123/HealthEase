import logging
from typing import Optional, Any, Dict
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

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


async def connect_to_mongo() -> None:
    """Initialize connection to MongoDB (Atlas or local) and ensure indexes."""
    logger.info("Connecting to MongoDB at %s (DB: %s)...", 
                settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else settings.MONGODB_URI, 
                settings.MONGODB_DB)
    try:
        db_state.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=10,
        )
        db_state.db = db_state.client[settings.MONGODB_DB]
        # Quick ping to verify connectivity
        await db_state.client.admin.command("ping")
        logger.info("Successfully connected to MongoDB!")
        await init_indexes()
        await bootstrap_admin()
    except Exception as exc:
        logger.warning("MongoDB initial connection error: %s. Application will continue with reconnection capability.", exc)


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
    """Ensure an administrator user exists on startup without requiring manual DB edits."""
    if db_state.db is None or not settings.ADMIN_EMAIL:
        return

    try:
        from app.security import get_password_hash

        existing = await db_state.db.users.find_one({"email": settings.ADMIN_EMAIL})
        if not existing:
            admin_doc = {
                "name": settings.ADMIN_NAME,
                "email": settings.ADMIN_EMAIL,
                "password": get_password_hash(settings.ADMIN_PASSWORD),
                "isAdmin": True,
                "isDoctor": False,
                "role": "admin",
                "notification": [],
                "seennotification": [],
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            }
            await db_state.db.users.insert_one(admin_doc)
            logger.info("Bootstrap: Created default administrator account (%s)", settings.ADMIN_EMAIL)
        else:
            # Ensure admin flags are set
            if not existing.get("isAdmin"):
                await db_state.db.users.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"isAdmin": True, "role": "admin"}}
                )
                logger.info("Bootstrap: Elevated existing user %s to admin", settings.ADMIN_EMAIL)
    except Exception as exc:
        logger.warning("Bootstrap admin check skipped: %s", exc)


def format_mongo_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Format MongoDB document into clean JSON-serializable dictionary."""
    if doc is None:
        return None

    cleaned = {}
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
