import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.dependencies import get_current_user
from app.cache import cache, KEY_HOSPITALS
from app.schemas import HospitalCreateRequest, HospitalUpdateRequest

logger = logging.getLogger("healthease.hospital_routes")
router = APIRouter(prefix="/hospitals", tags=["Hospitals & Locations"])


@router.get("")
async def list_hospitals(current_user: dict = Depends(get_current_user)):
    """
    List all hospitals with services and coordinates.
    Cached in Redis with transparent invalidation.
    """
    # 1. Try Redis cache
    cached = await cache.get_json(KEY_HOSPITALS)
    if cached is not None:
        return {
            "success": True,
            "message": "Hospitals fetched successfully (Cached)",
            "data": cached,
        }

    db = get_database()
    cursor = db.hospitals.find({}).sort("name", 1)
    hospitals = []
    async for h in cursor:
        hospitals.append(format_mongo_doc(h))

    # Cache in Redis
    await cache.set_json(KEY_HOSPITALS, hospitals)

    return {
        "success": True,
        "message": "Hospitals fetched successfully",
        "data": hospitals,
    }


@router.get("/{hospital_id}")
async def get_hospital_details(
    hospital_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve full details of a specific hospital."""
    db = get_database()
    query = {"_id": ObjectId(hospital_id)} if ObjectId.is_valid(hospital_id) else {"_id": hospital_id}
    hospital = await db.hospitals.find_one(query)

    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    return {
        "success": True,
        "message": "Hospital details fetched",
        "data": format_mongo_doc(hospital),
    }


@router.post("")
async def create_hospital(
    body: HospitalCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new hospital listing.
    Permitted for Administrators and Approved Doctors.
    """
    is_admin = current_user.get("isAdmin", False) or current_user.get("role") == "admin"
    is_doctor = current_user.get("isDoctor", False) or current_user.get("role") == "doctor"

    if not is_admin and not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Doctors or Administrators can register hospitals",
        )

    db = get_database()
    hosp_doc = body.model_dump()
    hosp_doc["createdBy"] = str(current_user.get("_id") or current_user.get("id"))
    hosp_doc["createdAt"] = datetime.now(timezone.utc)
    hosp_doc["updatedAt"] = datetime.now(timezone.utc)

    result = await db.hospitals.insert_one(hosp_doc)
    hosp_doc["_id"] = str(result.inserted_id)

    # Invalidate Redis cache
    await cache.invalidate_hospitals()

    logger.info("Hospital created: %s by user %s", body.name, hosp_doc["createdBy"])
    return {
        "success": True,
        "message": "Hospital created successfully",
        "data": format_mongo_doc(hosp_doc),
    }


@router.put("/{hospital_id}")
async def update_hospital(
    hospital_id: str,
    body: HospitalUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update hospital details (Admin or Doctor)."""
    is_admin = current_user.get("isAdmin", False) or current_user.get("role") == "admin"
    is_doctor = current_user.get("isDoctor", False) or current_user.get("role") == "doctor"

    if not is_admin and not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Doctors or Administrators can update hospitals",
        )

    db = get_database()
    query = {"_id": ObjectId(hospital_id)} if ObjectId.is_valid(hospital_id) else {"_id": hospital_id}

    update_fields = {k: v for k, v in body.model_dump().items() if v is not None}
    update_fields["updatedAt"] = datetime.now(timezone.utc)

    updated = await db.hospitals.find_one_and_update(
        query,
        {"$set": update_fields},
        return_document=True,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Hospital not found")

    await cache.invalidate_hospitals()

    return {
        "success": True,
        "message": "Hospital updated successfully",
        "data": format_mongo_doc(updated),
    }
