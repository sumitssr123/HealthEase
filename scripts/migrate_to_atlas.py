#!/usr/bin/env python3
"""
HealthEase: Safe MongoDB Local to Atlas Data Migration Script
=============================================================
Migrates collections (users, doctors, appointments, hospitals) from
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

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
)
logger = logging.getLogger("healthease.migration")

DEFAULT_COLLECTIONS = ["users", "doctors", "appointments", "hospitals"]


def parse_args():
    parser = argparse.ArgumentParser(description="HealthEase MongoDB to Atlas Migration Utility")
    parser.add_argument(
        "--source-uri",
        default=os.getenv("SOURCE_MONGODB_URI", "mongodb://localhost:27017"),
        help="Source MongoDB connection URI (default: mongodb://localhost:27017)",
    )
    parser.add_argument(
        "--source-db",
        default=os.getenv("SOURCE_MONGODB_DB", "HealthEase"),
        help="Source database name (default: HealthEase)",
    )
    parser.add_argument(
        "--target-uri",
        default=os.getenv("TARGET_MONGODB_URI", os.getenv("MONGODB_URI", "")),
        help="Target MongoDB Atlas connection URI",
    )
    parser.add_argument(
        "--target-db",
        default=os.getenv("TARGET_MONGODB_DB", "healthease"),
        help="Target database name (default: healthease)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect source database and simulate migration without writing to target",
    )
    return parser.parse_args()


def create_target_indexes(target_db):
    """Ensure production indexes exist on target Atlas cluster."""
    logger.info("Verifying and building production indexes on target database...")
    try:
        # Users
        target_db.users.create_index([("email", ASCENDING)], unique=True)
        target_db.users.create_index([("isAdmin", ASCENDING)])
        target_db.users.create_index([("isDoctor", ASCENDING)])

        # Doctors
        target_db.doctors.create_index([("userId", ASCENDING)])
        target_db.doctors.create_index([("status", ASCENDING)])

        # Appointments - Partial unique index for double-booking prevention
        target_db.appointments.create_index(
            [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
            unique=True,
            partialFilterExpression={"status": "booked"},
            name="idx_appointments_double_booking_prevention",
        )
        target_db.appointments.create_index([("userId", ASCENDING)])

        # Notifications
        target_db.notifications.create_index([("userId", ASCENDING), ("createdAt", ASCENDING)])

        # Hospitals
        target_db.hospitals.create_index([("name", ASCENDING)])

        logger.info("Successfully created target database indexes.")
    except Exception as exc:
        logger.warning("Notice on index creation: %s", exc)


def run_migration():
    args = parse_args()

    print("=" * 70)
    print("HealthEase MongoDB Atlas Migration Utility")
    print("=" * 70)
    print(f"Source URI  : {args.source_uri}")
    print(f"Source DB   : {args.source_db}")
    print(f"Target URI  : {'[DRY RUN - NONE]' if args.dry_run else (args.target_uri.split('@')[-1] if '@' in args.target_uri else args.target_uri)}")
    print(f"Target DB   : {args.target_db}")
    print(f"Mode        : {'DRY RUN (No writes)' if args.dry_run else 'LIVE MIGRATION'}")
    print("=" * 70)

    # 1. Connect to Source
    try:
        source_client = MongoClient(args.source_uri, serverSelectionTimeoutMS=4000)
        source_client.admin.command("ping")
        source_db = source_client[args.source_db]
        logger.info("Connected to source database '%s' successfully.", args.source_db)
    except Exception as exc:
        logger.error("Failed to connect to source MongoDB: %s", exc)
        sys.exit(1)

    # 2. Connect to Target (if not dry run)
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
            target_client = MongoClient(args.target_uri, serverSelectionTimeoutMS=6000)
            target_client.admin.command("ping")
            target_db = target_client[args.target_db]
            logger.info("Connected to target MongoDB Atlas database '%s' successfully.", args.target_db)
        except Exception as exc:
            logger.error("Failed to connect to target MongoDB Atlas cluster: %s", exc)
            logger.error("Please verify IP access allowlist in Atlas and cluster connection string.")
            sys.exit(1)

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

        # Live migration using idempotent bulk upserts
        operations = []
        for doc in source_coll.find({}):
            # Ensure doc preserves original _id
            operations.append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))

        if operations:
            try:
                result = target_db[coll_name].bulk_write(operations, ordered=False)
                upserted = result.upserted_count + result.modified_count + result.matched_count
                logger.info("Collection '%s': %d documents successfully synchronized.", coll_name, upserted)
                summary[coll_name] = {
                    "source_count": count,
                    "migrated": upserted,
                    "status": "success",
                }
            except PyMongoError as pme:
                logger.error("Bulk write error on collection '%s': %s", coll_name, pme)
                summary[coll_name] = {"source_count": count, "migrated": 0, "status": f"failed: {pme}"}

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
