import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Body, status
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.database import get_database, format_mongo_doc
from app.dependencies import get_current_user
from app.rate_limiter import check_rate_limit
from app.queue import publish_notification_event, persist_notification_direct
from app.schemas import CheckAvailabilityRequest, BookAppointmentRequest

logger = logging.getLogger("healthease.appointment_routes")
router = APIRouter(tags=["Appointments"])


# ========================================================
# 1. CHECK BOOKING AVAILABILITY
# ========================================================
@router.post("/user/booking-availbility")
@router.post("/user/booking-availability")
async def check_booking_availability(
    body: CheckAvailabilityRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Check if a specific doctor's slot is already booked.
    Cancelled appointments do NOT block availability.
    """
    db = get_database()
    doctor_id = str(body.doctorId)
    date = str(body.date).strip()
    time = str(body.time).strip()

    # Query for active booking
    conflict = await db.appointments.find_one({
        "doctorId": doctor_id,
        "date": date,
        "time": time,
        "status": "booked",
    })

    if conflict:
        return {
            "success": False,
            "message": "Doctor is not available at this time",
        }

    return {
        "success": True,
        "message": "Slot is Available! You can book now.",
    }


# ========================================================
# 2. BOOK APPOINTMENT (Immediate confirmation & No double bookings)
# ========================================================
@router.post("/user/book-appointment")
async def book_appointment(
    request: Request,
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Book an appointment.
    Rules:
    1. Immediately confirmed as 'booked' (no pending approval workflow).
    2. Double booking is prevented at both the application level AND
       database engine level via a unique partial index on (doctorId, date, time).
    3. Notifies doctor and patient asynchronously via RabbitMQ.
    """
    # Rate limit: 10 booking requests per minute
    await check_rate_limit(request, key_prefix="booking", max_requests=10, window_seconds=60)

    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    doctor_id = str(body.get("doctorId"))
    date = str(body.get("date", "")).strip()
    time = str(body.get("time", "")).strip()

    if not doctor_id or not date or not time:
        return {"success": False, "message": "Doctor ID, date, and time are required"}

    # Fetch doctor info if not provided
    doctor_info: Dict[str, Any] = body.get("doctorInfo") or {}
    if not doctor_info:
        doc_q = {"_id": ObjectId(doctor_id)} if ObjectId.is_valid(doctor_id) else {"_id": doctor_id}
        doc_found = await db.doctors.find_one(doc_q)
        doctor_info = format_mongo_doc(doc_found) if doc_found else {}

    user_info = body.get("userInfo") or current_user

    # Double Booking Prevention: Check active booking conflict
    conflict = await db.appointments.find_one({
        "doctorId": doctor_id,
        "date": date,
        "time": time,
        "status": "booked",
    })
    if conflict:
        return {
            "success": False,
            "message": "Slot Conflict: This appointment slot is already booked. Please select another time.",
        }

    appointment_doc = {
        "userId": user_id,
        "doctorId": doctor_id,
        "doctorInfo": doctor_info,
        "userInfo": user_info,
        "date": date,
        "time": time,
        "status": "booked",  # Immediately confirmed!
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    try:
        result = await db.appointments.insert_one(appointment_doc)
        appointment_id = str(result.inserted_id)
        appointment_doc["_id"] = appointment_id
        appointment_doc["id"] = appointment_id

        # Notify doctor via RabbitMQ
        doctor_user_id = doctor_info.get("userId")
        doctor_name = f"Dr. {doctor_info.get('firstName', '')} {doctor_info.get('lastName', '')}"
        patient_name = user_info.get("name", "Patient")

        if doctor_user_id:
            msg_doc = f"New appointment booked by {patient_name} for {date} at {time}"
            pub = publish_notification_event(
                event_type="appointment-booked",
                recipient_user_id=str(doctor_user_id),
                message=msg_doc,
                on_click_path="/doctor-appointments",
                metadata={"appointmentId": appointment_id, "date": date, "time": time},
            )
            if not pub:
                await persist_notification_direct(
                    recipient_user_id=str(doctor_user_id),
                    message=msg_doc,
                    event_type="appointment-booked",
                    on_click_path="/doctor-appointments",
                )

        # Notify patient
        msg_patient = f"Your appointment with {doctor_name} on {date} at {time} is confirmed!"
        pub_p = publish_notification_event(
            event_type="appointment-confirmed",
            recipient_user_id=user_id,
            message=msg_patient,
            on_click_path="/appointments",
            metadata={"appointmentId": appointment_id},
        )
        if not pub_p:
            await persist_notification_direct(
                recipient_user_id=user_id,
                message=msg_patient,
                event_type="appointment-confirmed",
                on_click_path="/appointments",
            )

        logger.info("Appointment %s successfully booked (Doctor: %s, User: %s)", appointment_id, doctor_id, user_id)
        return {
            "success": True,
            "message": "Appointment Booked Successfully",
            "data": format_mongo_doc(appointment_doc),
        }

    except DuplicateKeyError:
        # Database partial unique index prevented race-condition double-booking!
        logger.warning("Double-booking prevented by unique index for Doctor %s on %s %s", doctor_id, date, time)
        return {
            "success": False,
            "message": "Slot Conflict: This appointment slot was just booked by another patient. Please select another time.",
        }
    except Exception as exc:
        logger.error("Error booking appointment: %s", exc)
        return {"success": False, "message": "Error while booking appointment"}


# ========================================================
# 3. GET PATIENT'S OWN APPOINTMENTS
# ========================================================
@router.get("/user/user-appointments")
async def get_user_appointments(current_user: dict = Depends(get_current_user)):
    """
    Retrieve all appointments for the currently logged in patient.
    Strictly isolated: Patients can NEVER view another patient's appointments.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))

    cursor = db.appointments.find({"userId": user_id}).sort("createdAt", -1)
    appointments = []
    async for appt in cursor:
        appointments.append(format_mongo_doc(appt))

    return {
        "success": True,
        "message": "Users Appointments Fetched Successfully",
        "data": appointments,
    }


# ========================================================
# 4. CANCEL APPOINTMENT (Patient or Doctor)
# ========================================================
@router.post("/user/cancel-appointment")
@router.post("/doctor/cancel-appointment")
@router.post("/doctor/update-status")
async def cancel_appointment(
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Cancel an appointment.
    Rules:
    1. Patients may only cancel their OWN appointments.
    2. Doctors may only cancel appointments booked with them.
    3. Admins may manage appointments.
    4. Status is updated to 'cancelled', which immediately frees up
       the slot for other patients!
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    is_admin = current_user.get("isAdmin", False)
    is_doctor = current_user.get("isDoctor", False)

    appointment_id = body.get("appointmentId") or body.get("appointmentsId") or body.get("id")
    requested_status = body.get("status", "cancelled").lower()

    # Map reject to cancelled
    if requested_status in ["reject", "rejected"]:
        requested_status = "cancelled"
    elif requested_status in ["approve", "approved"]:
        requested_status = "booked"

    if not appointment_id:
        return {"success": False, "message": "Appointment ID is required"}

    query = {"_id": ObjectId(appointment_id)} if ObjectId.is_valid(appointment_id) else {"_id": appointment_id}
    appointment = await db.appointments.find_one(query)

    if not appointment:
        return {"success": False, "message": "Appointment not found"}

    # Authorization Check
    patient_id = str(appointment.get("userId"))
    doctor_id = str(appointment.get("doctorId"))

    # If user is neither the patient, nor the doctor, nor admin -> forbid
    if not is_admin:
        if patient_id != user_id:
            # Check if current user is the doctor
            doc_record = await db.doctors.find_one({"userId": user_id})
            doc_record_id = str(doc_record["_id"]) if doc_record else ""
            if doc_record_id != doctor_id and str(appointment.get("doctorInfo", {}).get("userId")) != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to modify this appointment",
                )

    # Update appointment status
    updated = await db.appointments.find_one_and_update(
        query,
        {"$set": {"status": requested_status, "updatedAt": datetime.utcnow()}},
        return_document=True,
    )

    # Publish notification of status change
    notification_msg = f"Your appointment on {appointment.get('date')} at {appointment.get('time')} is now {requested_status}"
    publish_notification_event(
        event_type="appointment-status-updated",
        recipient_user_id=patient_id,
        message=notification_msg,
        on_click_path="/appointments",
        metadata={"appointmentId": appointment_id, "status": requested_status},
    )

    logger.info("Appointment %s status updated to '%s' by user %s", appointment_id, requested_status, user_id)
    return {
        "success": True,
        "message": f"Appointment {requested_status} successfully",
        "data": format_mongo_doc(updated),
    }
