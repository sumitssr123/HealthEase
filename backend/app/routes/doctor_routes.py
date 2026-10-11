import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.dependencies import get_current_user, require_doctor
from app.cache import cache, KEY_APPROVED_DOCTORS
from app.queue import publish_notification_event, persist_notification_direct
from app.schemas import DoctorApplyRequest, DoctorProfileUpdateRequest

logger = logging.getLogger("healthease.doctor_routes")
router = APIRouter(tags=["Doctors"])


# ========================================================
# 1. APPLY TO BECOME A DOCTOR (Patient -> Pending Status)
# ========================================================
@router.post("/user/apply-doctor")
async def apply_doctor(
    body: DoctorApplyRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Normal registered patient applies for doctor account.
    Status starts as 'pending' for administrator review.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))

    # Check if doctor application already exists for this user
    existing = await db.doctors.find_one({"userId": user_id})
    if existing:
        if existing.get("status") == "approved":
            return {"success": False, "message": "You are already an approved doctor"}
        elif existing.get("status") == "pending":
            return {"success": False, "message": "Your doctor application is already under review"}

    doctor_data = body.model_dump()
    doctor_data.update({
        "userId": user_id,
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    })

    result = await db.doctors.insert_one(doctor_data)
    doctor_id = str(result.inserted_id)

    # Notify administrator
    admin_user = await db.users.find_one({"isAdmin": True})
    if admin_user:
        admin_id = str(admin_user["_id"])
        notification_msg = f"{body.firstName} {body.lastName} has applied for a Doctor Account"
        published = publish_notification_event(
            event_type="apply-doctor-request",
            recipient_user_id=admin_id,
            message=notification_msg,
            on_click_path="/admin/doctors",
            metadata={"doctorId": doctor_id, "name": f"{body.firstName} {body.lastName}"},
        )
        if not published:
            await persist_notification_direct(
                recipient_user_id=admin_id,
                message=notification_msg,
                event_type="apply-doctor-request",
                on_click_path="/admin/doctors",
                metadata={"doctorId": doctor_id, "name": f"{body.firstName} {body.lastName}"},
            )

    logger.info("Doctor application submitted for user %s (Doc ID: %s)", user_id, doctor_id)
    return {
        "success": True,
        "message": "Doctor Account Applied Successfully",
    }


# ========================================================
# 2. GET ALL APPROVED DOCTORS (Cached in Redis)
# ========================================================
@router.get("/user/getAllDoctors")
@router.get("/doctor/getAllDoctors")
async def get_all_approved_doctors(current_user: dict = Depends(get_current_user)):
    """
    Retrieve all approved doctors for directory display.
    Optimized with Redis caching (5 min TTL) with automatic invalidation.
    """
    # 1. Try Redis cache
    cached_docs = await cache.get_json(KEY_APPROVED_DOCTORS)
    if cached_docs is not None:
        return {
            "success": True,
            "message": "Doctors Lists Fetched Successfully (Cached)",
            "data": cached_docs,
        }

    # 2. Fetch from MongoDB
    db = get_database()
    cursor = db.doctors.find({"status": "approved"}).sort("createdAt", -1)
    doctors = []
    async for doc in cursor:
        doctors.append(format_mongo_doc(doc))

    # 3. Cache result in Redis
    await cache.set_json(KEY_APPROVED_DOCTORS, doctors)

    return {
        "success": True,
        "message": "Doctors Lists Fetched Successfully",
        "data": doctors,
    }


# ========================================================
# 3. GET SINGLE DOCTOR BY ID
# ========================================================
@router.post("/doctor/getDoctorById")
async def get_doctor_by_id_post(
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Fetch single doctor profile by doctorId."""
    doctor_id = body.get("doctorId") or body.get("id")
    if not doctor_id:
        return {"success": False, "message": "Doctor ID required"}

    db = get_database()
    query = {"_id": ObjectId(doctor_id)} if ObjectId.is_valid(doctor_id) else {"_id": doctor_id}
    doctor = await db.doctors.find_one(query)

    if not doctor:
        return {"success": False, "message": "Doctor not found"}

    return {
        "success": True,
        "message": "Single Doc Info Fetched",
        "data": format_mongo_doc(doctor),
    }


# ========================================================
# 4. GET DOCTOR PROFILE FOR AUTHENTICATED DOCTOR
# ========================================================
@router.post("/doctor/getDoctorInfo")
async def get_doctor_info(
    body: Optional[Dict[str, Any]] = Body(None),
    current_user: dict = Depends(get_current_user),
):
    """Fetch profile data of the logged-in doctor."""
    db = get_database()
    target_user_id = (body and body.get("userId")) or str(current_user.get("_id") or current_user.get("id"))

    doctor = await db.doctors.find_one({"userId": target_user_id})
    if not doctor:
        return {"success": False, "message": "Doctor profile not found", "data": None}

    return {
        "success": True,
        "message": "doctor data fetch success",
        "data": format_mongo_doc(doctor),
    }


# ========================================================
# 5. UPDATE DOCTOR PROFILE
# ========================================================
@router.post("/doctor/updateProfile")
async def update_doctor_profile(
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(require_doctor),
):
    """
    Approved doctors update their permitted professional details.
    Invalidates Redis cache to keep directories up to date.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))

    # Update query based on user's own userId (prevents updating other doctors)
    update_data = {k: v for k, v in body.items() if k not in ["_id", "userId", "status", "createdAt"]}
    update_data["updatedAt"] = datetime.utcnow()

    updated = await db.doctors.find_one_and_update(
        {"userId": user_id},
        {"$set": update_data},
        return_document=True,
    )

    if not updated:
        return {"success": False, "message": "Doctor record not found"}

    # Invalidate Redis cache
    await cache.invalidate_doctors(str(updated["_id"]))

    logger.info("Doctor profile updated for user %s", user_id)
    return {
        "success": True,
        "message": "Doctor Profile Updated",
        "data": format_mongo_doc(updated),
    }


# ========================================================
# 6. DOCTOR'S OWN APPOINTMENTS DASHBOARD
# ========================================================
@router.get("/doctor/doctor-appointments")
async def get_doctor_appointments(current_user: dict = Depends(require_doctor)):
    """
    Fetch appointments for the currently logged-in doctor.
    Doctors cannot access or view another doctor's appointments.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))

    doctor = await db.doctors.find_one({"userId": user_id})
    if not doctor:
        return {"success": True, "message": "No doctor profile found", "data": []}

    doc_id_str = str(doctor["_id"])
    query = {
        "$or": [
            {"doctorId": doc_id_str},
            {"doctorId": doctor["_id"]},
            {"doctorInfo._id": doc_id_str},
            {"doctorInfo._id": doctor["_id"]},
        ]
    }

    cursor = db.appointments.find(query).sort("createdAt", -1)
    appointments = []
    async for appt in cursor:
        appointments.append(format_mongo_doc(appt))

    return {
        "success": True,
        "message": "Doctor Appointments Fetch Successfully",
        "data": appointments,
    }
