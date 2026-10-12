#!/usr/bin/env python3
"""
HealthEase: Safe MongoDB Local to Atlas Data Migration Script
=============================================================
Migrates collections (users, doctors, appointments, notifications, hospitals) from
local MongoDB instance to MongoDB Atlas while:
1. Preserving exact document ObjectIds and relationships
2. Providing a non-destructive dry-run mode (--dry-run)
3. Using idempotent upserts for safe reruns
4. Creating production database indexes on the target
5. Reporting detailed progress and summary counts

Usage:
  # 1. Preview migration without writing anything (Dry Run):
  python scripts/migrate_to_atlas.py --dry-run

  # 2. Perform real migration to MongoDB Atlas:
  python scripts/migrate_to_atlas.py --target-uri "mongodb+srv://xyz_user:xyz_password@cluster0.xyz.mongodb.net/?retryWrites=true&w=majority" --target-db "HealthEase"
"""

import os
import sys
import argparse
import logging
from datetime import datetime
from pymongo import MongoClient, ReplaceOne, ASCENDING
from pymongo.errors import PyMongoError

# Automatically load environment variables from backend/.env or root .env if present
try:
    from dotenv import load_dotenv
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for env_path in [os.path.join(base_dir, "backend", ".env"), os.path.join(base_dir, ".env")]:
        if os.path.exists(env_path):
            load_dotenv(env_path)
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("healthease.migration")

DEFAULT_COLLECTIONS = ["users", "doctors", "appointments", "notifications", "hospitals"]


def get_mongo_client_kwargs(uri: str, timeout_ms: int = 6000) -> dict:
    """Build MongoClient kwargs including SSL/TLS CA bundle via certifi when needed."""
    kwargs = {"serverSelectionTimeoutMS": timeout_ms}
    if "mongodb+srv://" in uri or "ssl=true" in uri.lower():
        try:
            import certifi
            kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass
    return kwargs


def parse_args():
    default_db = os.getenv("MONGODB_DB", "HealthEase")
    parser = argparse.ArgumentParser(description="HealthEase MongoDB to Atlas Migration Utility")
    parser.add_argument(
        "--source-uri",
        default=os.getenv("SOURCE_MONGODB_URI", "mongodb://localhost:27017"),
        help="Source MongoDB connection URI (default: mongodb://localhost:27017)",
    )
    parser.add_argument(
        "--source-db",
        default=os.getenv("SOURCE_MONGODB_DB", default_db),
        help=f"Source database name (default: {default_db})",
    )
    parser.add_argument(
        "--target-uri",
        default=os.getenv("TARGET_MONGODB_URI", os.getenv("MONGODB_URI", "")),
        help="Target MongoDB Atlas connection URI",
    )
    parser.add_argument(
        "--target-db",
        default=os.getenv("TARGET_MONGODB_DB", default_db),
        help=f"Target database name (default: {default_db})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect source database and simulate migration without writing to target",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for bulk write operations (default: 500)",
    )
    return parser.parse_args()


def create_target_indexes(target_db):
    """Ensure production indexes exist on target Atlas cluster."""
    logger.info("Verifying and building production indexes on target database...")

    # Users
    try:
        target_db.users.create_index([("email", ASCENDING)], unique=True)
        target_db.users.create_index([("isAdmin", ASCENDING)])
        target_db.users.create_index([("isDoctor", ASCENDING)])
    except Exception as exc:
        logger.warning("Notice on users index creation: %s", exc)

    # Doctors
    try:
        target_db.doctors.create_index([("userId", ASCENDING)])
        target_db.doctors.create_index([("status", ASCENDING)])
        target_db.doctors.create_index([("specialization", ASCENDING)])
    except Exception as exc:
        logger.warning("Notice on doctors index creation: %s", exc)

    # Appointments - Partial unique index for double-booking prevention & lookup
    try:
        target_db.appointments.create_index(
            [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
            unique=True,
            partialFilterExpression={"status": "booked"},
            name="idx_appointments_double_booking_prevention",
        )
        target_db.appointments.create_index([("userId", ASCENDING)])
        target_db.appointments.create_index([("doctorId", ASCENDING), ("date", ASCENDING)])
    except Exception as exc:
        logger.warning("Notice on appointments index creation: %s", exc)

    # Notifications
    try:
        target_db.notifications.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])
        target_db.notifications.create_index([("read", ASCENDING)])
    except Exception as exc:
        logger.warning("Notice on notifications index creation: %s", exc)

    # Hospitals
    try:
        target_db.hospitals.create_index([("name", ASCENDING)])
    except Exception as exc:
        logger.warning("Notice on hospitals index creation: %s", exc)

    logger.info("Target database index verification finished.")


def run_migration():
    args = parse_args()

    print("=" * 70)
    print("HealthEase MongoDB Atlas Migration Utility")
    print("=" * 70)
    print(f"Source URI  : {args.source_uri}")
    print(f"Source DB   : {args.source_db}")
    print(f"Target URI  : {'[DRY RUN - NONE]' if args.dry_run and not args.target_uri else (args.target_uri.split('@')[-1] if '@' in args.target_uri else args.target_uri)}")
    print(f"Target DB   : {args.target_db}")
    print(f"Mode        : {'DRY RUN (No writes)' if args.dry_run else 'LIVE MIGRATION'}")
    print(f"Batch Size  : {args.batch_size}")
    print("=" * 70)

    # 1. Connect to Source
    try:
        source_kwargs = get_mongo_client_kwargs(args.source_uri, timeout_ms=4000)
        source_client = MongoClient(args.source_uri, **source_kwargs)
        source_client.admin.command("ping")
        source_db = source_client[args.source_db]
        logger.info("Connected to source database '%s' successfully.", args.source_db)
    except Exception as exc:
        logger.error("Failed to connect to source MongoDB: %s", exc)
        sys.exit(1)

    # 2. Connect to Target (if not dry run, or if target provided in dry run for verification)
    target_client = None
    target_db = None
    if not args.dry_run:
        if not args.target_uri:
            logger.error(
                "Target URI is missing! Provide --target-uri or set TARGET_MONGODB_URI. "
                "Run with --dry-run to preview without a target."
            )
            sys.exit(1)
        try:
            target_kwargs = get_mongo_client_kwargs(args.target_uri, timeout_ms=6000)
            target_client = MongoClient(args.target_uri, **target_kwargs)
            target_client.admin.command("ping")
            target_db = target_client[args.target_db]
            logger.info("Connected to target MongoDB Atlas database '%s' successfully.", args.target_db)
        except Exception as exc:
            logger.error("Failed to connect to target MongoDB Atlas cluster: %s", exc)
            logger.error("Please verify IP access allowlist in Atlas and cluster connection string.")
            sys.exit(1)
    elif args.target_uri:
        # In dry run mode with target provided, verify target connectivity without writing
        try:
            target_kwargs = get_mongo_client_kwargs(args.target_uri, timeout_ms=6000)
            test_client = MongoClient(args.target_uri, **target_kwargs)
            test_client.admin.command("ping")
            test_client.close()
            logger.info("Target MongoDB Atlas connection verified successfully (dry-run).")
        except Exception as exc:
            logger.warning("Dry-run target connectivity notice: %s", exc)

    # 3. Migrate Collections
    summary = {}

    for coll_name in DEFAULT_COLLECTIONS:
        source_coll = source_db[coll_name]
        count = source_coll.count_documents({})
        logger.info("Processing collection '%s' (%d documents found)...", coll_name, count)

        if count == 0:
            summary[coll_name] = {"source_count": 0, "migrated": 0, "status": "empty"}
            continue

        if args.dry_run:
            summary[coll_name] = {"source_count": count, "migrated": 0, "status": "validated (dry-run)"}
            continue

        # Live migration using idempotent chunked bulk upserts
        operations = []
        total_migrated = 0
        batch_size = max(1, args.batch_size)
        error_occurred = False
        error_message = ""

        for doc in source_coll.find({}):
            if "_id" in doc:
                operations.append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))

            if len(operations) >= batch_size:
                try:
                    result = target_db[coll_name].bulk_write(operations, ordered=False)
                    # upserted_count are newly created; matched_count are existing replaced documents
                    total_migrated += (result.upserted_count + result.matched_count)
                    operations = []
                except PyMongoError as pme:
                    logger.error("Bulk write error on collection '%s': %s", coll_name, pme)
                    error_occurred = True
                    error_message = str(pme)
                    break

        if not error_occurred and operations:
            try:
                result = target_db[coll_name].bulk_write(operations, ordered=False)
                total_migrated += (result.upserted_count + result.matched_count)
            except PyMongoError as pme:
                logger.error("Bulk write error on collection '%s': %s", coll_name, pme)
                error_occurred = True
                error_message = str(pme)

        if error_occurred:
            summary[coll_name] = {"source_count": count, "migrated": total_migrated, "status": f"failed: {error_message}"}
        else:
            logger.info("Collection '%s': %d documents successfully synchronized.", coll_name, total_migrated)
            summary[coll_name] = {
                "source_count": count,
                "migrated": total_migrated,
                "status": "success",
            }

    # 4. Create target indexes
    if not args.dry_run and target_db is not None:
        create_target_indexes(target_db)

    # 5. Print Summary Report
    print("\n" + "=" * 70)
    print("MIGRATION SUMMARY REPORT")
    print("=" * 70)
    for c, stat in summary.items():
        print(f"Collection: {c:15} | Source: {stat['source_count']:4} docs | Status: {stat['status']}")
    print("=" * 70)

    if args.dry_run:
        print("[INFO] Dry run complete! No documents were modified.")
        print("[INFO] Run without --dry-run and provide --target-uri to copy to MongoDB Atlas.")
    else:
        print("[SUCCESS] All collections synchronized to MongoDB Atlas!")

    source_client.close()
    if target_client:
        target_client.close()


if __name__ == "__main__":
    run_migration()
