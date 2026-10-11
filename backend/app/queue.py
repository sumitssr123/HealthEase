import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import pika
from bson import ObjectId

from app.config import settings
from app.database import get_database

import time

logger = logging.getLogger("healthease.queue")
_broker_last_failure_time = 0.0
BROKER_RETRY_INTERVAL = 60.0  # seconds


def publish_notification_event(
    event_type: str,
    recipient_user_id: str,
    message: str,
    on_click_path: str = "/notification",
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Publish a notification event to RabbitMQ for asynchronous background processing.
    If RabbitMQ is unavailable, gracefully fall back to direct synchronous persistence
    so appointments and application updates are NEVER interrupted by broker downtime.
    """
    global _broker_last_failure_time
    now = time.time()

    # If broker failed recently, skip slow connection attempts and use fallback immediately
    if now - _broker_last_failure_time < BROKER_RETRY_INTERVAL:
        return False

    event_payload = {
        "event_type": event_type,
        "recipient_user_id": str(recipient_user_id),
        "message": message,
        "on_click_path": on_click_path,
        "metadata": metadata or {},
        "timestamp": datetime.utcnow().isoformat(),
    }

    try:
        # 1. Attempt publishing to RabbitMQ
        params = pika.URLParameters(settings.RABBITMQ_URL)
        params.socket_timeout = 0.5
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Declare durable queue
        channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)

        # Publish persistent message
        channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=json.dumps(event_payload),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
                content_type="application/json",
            ),
        )
        connection.close()
        logger.info("Published notification event [%s] to RabbitMQ queue '%s'", event_type, settings.RABBITMQ_QUEUE)
        return True

    except Exception as exc:
        _broker_last_failure_time = time.time()
        logger.warning(
            "RabbitMQ broker unavailable (%s). Switched to fast direct DB notification persistence.",
            exc,
        )
        return False


async def persist_notification_direct(
    recipient_user_id: str,
    message: str,
    event_type: str = "general",
    on_click_path: str = "/notification",
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Directly insert notification into MongoDB (used when RabbitMQ is offline or in worker)."""
    try:
        db = get_database()
        user_oid = ObjectId(recipient_user_id) if ObjectId.is_valid(recipient_user_id) else recipient_user_id

        notification_item = {
            "type": event_type,
            "message": message,
            "onClickPath": on_click_path,
            "data": metadata or {"onClickPath": on_click_path},
            "createdAt": datetime.utcnow(),
            "read": False,
        }

        # 1. Store in notifications collection
        notif_doc = {
            "userId": str(recipient_user_id),
            "type": event_type,
            "message": message,
            "onClickPath": on_click_path,
            "data": metadata or {},
            "read": False,
            "createdAt": datetime.utcnow(),
        }
        await db.notifications.insert_one(notif_doc)

        # 2. Update user document notification array for backwards compatibility
        query = {"_id": user_oid} if isinstance(user_oid, ObjectId) else {"_id": str(user_oid)}
        await db.users.update_one(
            query,
            {"$push": {"notification": notification_item}}
        )
        logger.info("Persisted in-app notification directly to MongoDB for user %s", recipient_user_id)
    except Exception as exc:
        logger.error("Failed to persist notification in MongoDB: %s", exc)
