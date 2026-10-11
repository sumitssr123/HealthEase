"""
HealthEase RabbitMQ Background Notification Worker
--------------------------------------------------
Consumes notification events from RabbitMQ and asynchronously
persists notification records into MongoDB.
Run standalone with: python backend/worker.py
"""

import os
import sys
import json
import time
import signal
import logging
from datetime import datetime
import pika
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# Ensure app package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

load_dotenv(os.path.join(current_dir, ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [Worker] %(message)s",
)
logger = logging.getLogger("healthease.worker")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "healthease")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "healthease_notifications")

running = True


def signal_handler(sig, frame):
    global running
    logger.info("Termination signal received. Shutting down gracefully...")
    running = False


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def process_notification(db, event_data: dict) -> bool:
    """Process a single notification event idempotently into MongoDB."""
    recipient_user_id = event_data.get("recipient_user_id")
    message = event_data.get("message", "New Notification")
    event_type = event_data.get("event_type", "general")
    on_click_path = event_data.get("on_click_path", "/notification")
    metadata = event_data.get("metadata", {})

    if not recipient_user_id:
        logger.warning("Notification event missing recipient_user_id: %s", event_data)
        return True  # Discard malformed message

    try:
        user_oid = ObjectId(recipient_user_id) if ObjectId.is_valid(recipient_user_id) else recipient_user_id

        # 1. Insert into notifications collection
        notif_doc = {
            "userId": str(recipient_user_id),
            "type": event_type,
            "message": message,
            "onClickPath": on_click_path,
            "data": metadata,
            "read": False,
            "createdAt": datetime.utcnow(),
        }
        db.notifications.insert_one(notif_doc)

        # 2. Push to user's notifications array for UI compatibility
        notification_item = {
            "type": event_type,
            "message": message,
            "onClickPath": on_click_path,
            "data": metadata or {"onClickPath": on_click_path},
            "createdAt": datetime.utcnow().isoformat(),
            "read": False,
        }

        query = {"_id": user_oid} if isinstance(user_oid, ObjectId) else {"_id": str(user_oid)}
        db.users.update_one(query, {"$push": {"notification": notification_item}})

        logger.info("Successfully persisted notification for User %s: '%s'", recipient_user_id, message)
        return True
    except Exception as exc:
        logger.error("Failed to persist notification in MongoDB: %s", exc)
        return False


def main():
    logger.info("Starting HealthEase RabbitMQ Notification Worker...")
    logger.info("Connecting to MongoDB at %s (DB: %s)...", MONGODB_URI.split("@")[-1], MONGODB_DB)
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = mongo_client[MONGODB_DB]

    # Verify Mongo
    try:
        mongo_client.admin.command("ping")
        logger.info("MongoDB connected successfully.")
    except Exception as exc:
        logger.error("MongoDB connection failed: %s. Exiting worker.", exc)
        return

    logger.info("Connecting to RabbitMQ broker at %s...", RABBITMQ_URL)

    while running:
        try:
            params = pika.URLParameters(RABBITMQ_URL)
            params.socket_timeout = 5.0
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
            channel.basic_qos(prefetch_count=1)

            logger.info("Waiting for notification messages on queue '%s' (Ctrl+C to exit)...", RABBITMQ_QUEUE)

            for method_frame, properties, body in channel.consume(RABBITMQ_QUEUE, auto_ack=False):
                if not running:
                    break

                try:
                    event_data = json.loads(body.decode("utf-8"))
                    logger.info("Received event: %s", event_data.get("event_type", "unknown"))
                    success = process_notification(db, event_data)
                    if success:
                        channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                    else:
                        # Requeue once on failure
                        channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON payload, acknowledging to discard: %s", body)
                    channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                except Exception as exc:
                    logger.error("Error processing message: %s", exc)
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)

            connection.close()

        except pika.exceptions.AMQPConnectionError as err:
            if running:
                logger.warning("RabbitMQ broker disconnected: %s. Retrying in 5 seconds...", err)
                time.sleep(5)
        except Exception as exc:
            if running:
                logger.error("Unexpected error in worker loop: %s. Retrying in 5 seconds...", exc)
                time.sleep(5)

    mongo_client.close()
    logger.info("Worker stopped successfully.")


if __name__ == "__main__":
    main()
