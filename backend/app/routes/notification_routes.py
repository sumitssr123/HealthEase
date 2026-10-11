import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, Body
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.dependencies import get_current_user

logger = logging.getLogger("healthease.notification_routes")
router = APIRouter(prefix="/user", tags=["Notifications"])


@router.get("/notifications")
async def get_user_notifications(current_user: dict = Depends(get_current_user)):
    """Retrieve full list of notifications for the authenticated user."""
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))

    cursor = db.notifications.find({"userId": user_id}).sort("createdAt", -1)
    notifications = []
    async for notif in cursor:
        notifications.append(format_mongo_doc(notif))

    return {
        "success": True,
        "data": notifications,
    }


@router.post("/get-all-notification")
async def mark_all_notifications_read(
    body: Dict[str, Any] = Body(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark all unread notifications as read.
    Transfers items from 'notification' to 'seennotification' for full frontend compatibility.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}

    user = await db.users.find_one(query)
    if not user:
        return {"success": False, "message": "User not found"}

    unread = user.get("notification", [])
    seen = user.get("seennotification", [])

    # Append unread to seen and clear unread
    seen.extend(unread)

    await db.users.update_one(
        query,
        {"$set": {"notification": [], "seennotification": seen, "updatedAt": datetime.utcnow()}}
    )

    # Also mark in notifications collection
    await db.notifications.update_many(
        {"userId": user_id, "read": False},
        {"$set": {"read": True}}
    )

    updated_user = await db.users.find_one(query)
    formatted = format_mongo_doc(updated_user)
    if "password" in formatted:
        del formatted["password"]

    logger.info("Marked all notifications as read for user %s", user_id)
    return {
        "success": True,
        "message": "all notification marked as read",
        "data": formatted,
    }


@router.post("/delete-all-notification")
async def delete_all_read_notifications(
    body: Dict[str, Any] = Body(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete all read/seen notifications for the authenticated user.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}

    await db.users.update_one(
        query,
        {"$set": {"seennotification": [], "updatedAt": datetime.utcnow()}}
    )

    await db.notifications.delete_many({"userId": user_id, "read": True})

    updated_user = await db.users.find_one(query)
    formatted = format_mongo_doc(updated_user)
    if "password" in formatted:
        del formatted["password"]

    logger.info("Cleared all read notifications for user %s", user_id)
    return {
        "success": True,
        "message": "Notifications Deleted Successfully",
        "data": formatted,
    }
