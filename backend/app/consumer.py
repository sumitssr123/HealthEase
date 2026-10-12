"""
HealthEase Embedded RabbitMQ Background Notification Consumer
--------------------------------------------------------------
Runs as a background daemon thread alongside FastAPI.
Ensures notifications are processed in real-time even during local development
without requiring a separate terminal running `python worker.py`.
"""

import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import pika
from bson import ObjectId
from pika.exceptions import AMQPConnectionError
from pymongo import MongoClient

from app.config import settings

logger = logging.getLogger("healthease.consumer")

_consumer_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()


def _process_message(db, event_data: dict) -> bool:
    """Persist notification into MongoDB collections (notifications and users)."""
    recipient_user_id = event_data.get("recipient_user_id")
    message = event_data.get("message", "New Notification")
    event_type = event_data.get("event_type", "general")
    on_click_path = event_data.get("on_click_path", "/notification")
    metadata = event_data.get("metadata", {})

    if not recipient_user_id:
        logger.warning("Consumer: Missing recipient_user_id in payload: %s", event_data)
        return True  # Acknowledge to drop invalid payload

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
            "createdAt": datetime.now(timezone.utc),
        }
        db.notifications.insert_one(notif_doc)

        # 2. Push to user's notifications array for immediate UI consumption
        notification_item = {
            "type": event_type,
            "message": message,
            "onClickPath": on_click_path,
            "data": metadata or {"onClickPath": on_click_path},
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "read": False,
        }
        query = {"_id": user_oid} if isinstance(user_oid, ObjectId) else {"_id": str(user_oid)}
        db.users.update_one(query, {"$push": {"notification": notification_item}})

        logger.info("Consumer: Persisted notification for user %s: '%s'", recipient_user_id, message)
        return True
    except Exception as exc:
        logger.error("Consumer: Failed to persist notification to MongoDB: %s", exc)
        return False


def _worker_loop():
    """Background worker loop connecting to MongoDB and RabbitMQ."""
    mongo_uri = settings.MONGODB_URI.strip('"\'')
    db_name = settings.MONGODB_DB.strip('"\'')
    rmq_url = settings.RABBITMQ_URL.strip('"\'')
    queue_name = settings.RABBITMQ_QUEUE.strip('"\'')

    client_kwargs: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000}
    if "mongodb+srv://" in mongo_uri or "ssl=true" in mongo_uri.lower():
        try:
            import certifi
            client_kwargs["tlsCAFile"] = certifi.where()
        except ImportError:
            pass

    try:
        mongo_client = MongoClient(mongo_uri, **client_kwargs)
        mongo_client.admin.command("ping")
        db = mongo_client[db_name]
        logger.info("Embedded RabbitMQ Consumer connected to MongoDB (%s)", db_name)
    except Exception as exc:
        logger.warning("Embedded Consumer: MongoDB connection error (%s). Worker thread exiting.", exc)
        return

    logger.info("Embedded RabbitMQ Consumer starting on queue '%s'...", queue_name)

    while not _stop_event.is_set():
        connection = None
        try:
            params = pika.URLParameters(rmq_url)
            params.socket_timeout = 5.0
            connection = pika.BlockingConnection(params)
            channel = connection.channel()

            channel.queue_declare(queue=queue_name, durable=True)
            channel.basic_qos(prefetch_count=1)

            logger.info("Embedded Consumer: Listening for messages on '%s'", queue_name)

            for method_frame, properties, body in channel.consume(queue_name, auto_ack=False, inactivity_timeout=1.0):
                if _stop_event.is_set():
                    break
                if not method_frame or body is None:
                    continue

                try:
                    event_data = json.loads(body.decode("utf-8"))
                    success = _process_message(db, event_data)
                    if success:
                        channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                    else:
                        channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)
                except json.JSONDecodeError:
                    logger.warning("Consumer: Discarding invalid JSON payload: %s", body)
                    channel.basic_ack(delivery_tag=method_frame.delivery_tag)
                except Exception as exc:
                    logger.error("Consumer: Error handling message: %s", exc)
                    channel.basic_nack(delivery_tag=method_frame.delivery_tag, requeue=True)

            if connection and connection.is_open:
                connection.close()

        except AMQPConnectionError as exc:
            if not _stop_event.is_set():
                logger.debug("Embedded Consumer: AMQP broker reconnecting in 5s (%s)...", exc)
                time.sleep(5)
        except Exception as exc:
            if not _stop_event.is_set():
                logger.debug("Embedded Consumer loop notice: %s. Retrying in 5s...", exc)
                time.sleep(5)
        finally:
            try:
                if connection and connection.is_open:
                    connection.close()
            except Exception:
                pass

    mongo_client.close()
    logger.info("Embedded RabbitMQ Consumer thread stopped.")


def start_embedded_consumer():
    """Start the embedded background consumer daemon thread."""
    global _consumer_thread, _stop_event
    if _consumer_thread is not None and _consumer_thread.is_alive():
        logger.debug("Embedded consumer is already running.")
        return

    _stop_event.clear()
    _consumer_thread = threading.Thread(
        target=_worker_loop,
        name="healthease-rmq-consumer",
        daemon=True,
    )
    _consumer_thread.start()
    logger.info("Started embedded RabbitMQ background consumer thread.")


def stop_embedded_consumer():
    """Stop the embedded background consumer thread."""
    global _consumer_thread, _stop_event
    _stop_event.set()
    if _consumer_thread and _consumer_thread.is_alive():
        _consumer_thread.join(timeout=2.0)
    logger.info("Stopped embedded RabbitMQ consumer.")
