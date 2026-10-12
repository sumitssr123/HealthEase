import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.dependencies import require_admin
from app.cache import cache
from app.queue import publish_notification_event, persist_notification_direct
from app.schemas import ChangeAccountStatusRequest, BlockUserRequest

logger = logging.getLogger("healthease.admin_routes")
router = APIRouter(prefix="/admin", tags=["Administrator Operations"])


# ========================================================
# 1. ADMIN DASHBOARD STATS
# ========================================================
@router.get("/stats")
@router.get("/dashboard-stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    """
    Get aggregated system statistics for Admin Dashboard.
    Counts: registered users, verified doctors, pending applications, appointments.
    """
    db = get_database()
    total_users = await db.users.count_documents({})
    approved_doctors = await db.doctors.count_documents({"status": "approved"})
    pending_doctors = await db.doctors.count_documents({"status": "pending"})
    total_appointments = await db.appointments.count_documents({})
    total_hospitals = await db.hospitals.count_documents({})

    return {
        "success": True,
        "data": {
            "totalUsers": total_users,
            "approvedDoctors": approved_doctors,
            "pendingDoctors": pending_doctors,
            "totalAppointments": total_appointments,
            "totalHospitals": total_hospitals,
        }
    }


# ========================================================
# 2. GET ALL USERS LIST
# ========================================================
@router.get("/getAllUsers")
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Fetch complete list of users and their roles for admin review."""
    db = get_database()
    cursor = db.users.find({}).sort("createdAt", -1)
    users = []
    async for u in cursor:
        doc = format_mongo_doc(u)
        if doc:
            if "password" in doc:
                del doc["password"]
            users.append(doc)

    return {
        "success": True,
        "message": "users data list",
        "data": users,
    }


# ========================================================
# 3. GET ALL DOCTORS LIST
# ========================================================
@router.get("/getAllDoctors")
async def get_all_doctors(current_user: dict = Depends(require_admin)):
    """Fetch complete list of doctors and their approval statuses."""
    db = get_database()
    cursor = db.doctors.find({}).sort("createdAt", -1)
    doctors = []
    async for d in cursor:
        doctors.append(format_mongo_doc(d))

    return {
        "success": True,
        "message": "Doctors Data list",
        "data": doctors,
    }


# ========================================================
# 4. APPROVE OR REJECT DOCTOR APPLICATION
# ========================================================
@router.post("/changeAccountStatus")
async def change_account_status(
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(require_admin),
):
    """
    Administrator approves or rejects a doctor application.
    Updates doctor status and promotes/demotes user's doctor role.
    Invalidates doctor directory cache and triggers background notification.
    """
    doctor_id = body.get("doctorId") or body.get("id")
    new_status = str(body.get("status", "pending")).lower()

    if not doctor_id:
        return {"success": False, "message": "Doctor ID required"}

    if new_status not in ["approved", "rejected", "pending"]:
        return {"success": False, "message": "Invalid status value"}

    db = get_database()
    doc_query = {"_id": ObjectId(doctor_id)} if ObjectId.is_valid(doctor_id) else {"_id": doctor_id}
    
    # 1. Update doctor status
    doctor = await db.doctors.find_one_and_update(
        doc_query,
        {"$set": {"status": new_status, "updatedAt": datetime.now(timezone.utc)}},
        return_document=True,
    )

    if not doctor:
        return {"success": False, "message": "Doctor record not found"}

    # 2. Update user's isDoctor flag and role
    doctor_user_id = doctor.get("userId")
    if doctor_user_id:
        user_query = {"_id": ObjectId(doctor_user_id)} if ObjectId.is_valid(doctor_user_id) else {"_id": doctor_user_id}
        is_doctor_flag = (new_status == "approved")
        role = "doctor" if is_doctor_flag else "patient"

        await db.users.update_one(
            user_query,
            {"$set": {"isDoctor": is_doctor_flag, "role": role, "updatedAt": datetime.now(timezone.utc)}}
        )

        # 3. Publish in-app notification via RabbitMQ
        notif_message = f"Your Doctor Account application has been {new_status}!"
        pub = publish_notification_event(
            event_type="doctor-account-request-updated",
            recipient_user_id=str(doctor_user_id),
            message=notif_message,
            on_click_path="/notification",
            metadata={"status": new_status, "doctorId": str(doctor["_id"])},
        )
        if not pub:
            await persist_notification_direct(
                recipient_user_id=str(doctor_user_id),
                message=notif_message,
                event_type="doctor-account-request-updated",
                on_click_path="/notification",
                metadata={"status": new_status},
            )

    # 4. Invalidate Redis Cache
    await cache.invalidate_doctors(str(doctor["_id"]))

    logger.info("Doctor %s application status updated to '%s' by Admin", doctor_id, new_status)
    return {
        "success": True,
        "message": "Account Status Updated",
        "data": format_mongo_doc(doctor),
    }


# ========================================================
# 5. BLOCK / REMOVE USER
# ========================================================
@router.post("/blockUser")
async def block_user(
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(require_admin),
):
    """Admin removes or blocks an offending user."""
    block_id = body.get("blockId") or body.get("userId")
    if not block_id:
        return {"success": False, "message": "User ID to block is required"}

    db = get_database()
    query = {"_id": ObjectId(block_id)} if ObjectId.is_valid(block_id) else {"_id": block_id}

    # Prevent deleting own admin account
    admin_id = str(current_user.get("_id") or current_user.get("id"))
    if str(block_id) == admin_id:
        return {"success": False, "message": "Cannot block your own administrator account"}

    await db.users.delete_one(query)
    # Also remove doctor record if any
    await db.doctors.delete_many({"userId": str(block_id)})

    await cache.invalidate_doctors()
    logger.info("Admin blocked user %s", block_id)

    return {
        "success": True,
        "message": "User Blocked Successfully",
    }
