import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

# Ensure backend package is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.config import settings


@pytest.fixture(scope="session")
def client():
    """Session test client running FastAPI lifespan startup and shutdown."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def unique_patient_credentials():
    uid = uuid.uuid4().hex[:6]
    return {
        "name": f"Test Patient {uid}",
        "email": f"patient_{uid}@example.com",
        "password": "Password@123",
    }


# ========================================================
# 1. Operational & Health Probes
# ========================================================
def test_liveness_health_check(client):
    """Verify /health returns 200 OK and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data.get("status") == "healthy"
    assert "timestamp" in json_data


def test_readiness_probe(client):
    """Verify /ready probe reports dependency connectivity."""
    response = client.get("/ready")
    assert response.status_code in [200, 503]
    json_data = response.json()
    assert "dependencies" in json_data


# ========================================================
# 2. Authentication & RBAC
# ========================================================
def test_patient_registration_and_login(client, unique_patient_credentials):
    """Test standard patient registration and subsequent JWT login."""
    # Register
    reg_res = client.post("/api/v1/user/register", json=unique_patient_credentials)
    assert reg_res.status_code == 200
    assert reg_res.json().get("success") is True

    # Duplicate registration should be rejected
    dup_res = client.post("/api/v1/user/register", json=unique_patient_credentials)
    assert dup_res.json().get("success") is False

    # Login with valid password
    login_res = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data.get("success") is True
    assert "token" in login_data
    token = login_data["token"]

    # Verify protected /getUserData with Bearer token
    auth_res = client.get("/api/v1/user/getUserData", headers={"Authorization": f"Bearer {token}"})
    assert auth_res.status_code == 200
    user_data = auth_res.json().get("data", {})
    assert user_data.get("email") == unique_patient_credentials["email"]
    assert user_data.get("isAdmin") is False


def test_login_invalid_password(client, unique_patient_credentials):
    """Verify login failure on bad password."""
    res = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": "WrongPassword999!",
    })
    assert res.status_code == 200
    assert res.json().get("success") is False


def test_rbac_patient_forbidden_from_admin(client, unique_patient_credentials):
    """Verify normal patients cannot access admin endpoints."""
    login_res = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    })
    token = login_res.json()["token"]

    admin_res = client.get("/api/v1/admin/getAllUsers", headers={"Authorization": f"Bearer {token}"})
    assert admin_res.status_code == 403


# ========================================================
# 3. Doctor Application & Directory
# ========================================================
def test_doctor_application_workflow(client):
    """Test doctor application creation and directory listing."""
    uid = uuid.uuid4().hex[:6]
    doc_user = {
        "name": f"Dr Applicant {uid}",
        "email": f"doc_{uid}@example.com",
        "password": "Password@123",
    }
    client.post("/api/v1/user/register", json=doc_user)
    token = client.post("/api/v1/user/login", json={
        "email": doc_user["email"],
        "password": doc_user["password"],
    }).json()["token"]

    # Submit doctor application
    apply_payload = {
        "firstName": "Sanjeev",
        "lastName": f"Kapoor{uid}",
        "phone": "9876543210",
        "email": doc_user["email"],
        "address": "MG Road, Suite 404, Prayagraj",
        "specialization": "Cardiologist",
        "experience": "8 years",
        "feesPerCunsultation": 600,
        "timings": ["09:00", "17:00"],
    }
    apply_res = client.post(
        "/api/v1/user/apply-doctor",
        json=apply_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert apply_res.status_code == 200
    assert apply_res.json().get("success") is True


# ========================================================
# 4. Appointment Booking & Double-Booking Prevention
# ========================================================
def test_appointment_booking_and_double_booking_prevention(client, unique_patient_credentials):
    """
    Mandatory Test:
    1. Patient books an appointment (immediately confirmed).
    2. Attempting to book the SAME slot must fail (prevent double booking).
    3. Cancelling frees the slot.
    """
    # Ensure patient registered and login
    client.post("/api/v1/user/register", json=unique_patient_credentials)
    login_resp = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    }).json()
    assert login_resp.get("success") is True, f"Login failed: {login_resp}"
    token = login_resp["token"]

    # Retrieve an approved doctor from the directory
    docs_res = client.get("/api/v1/user/getAllDoctors", headers={"Authorization": f"Bearer {token}"})
    docs = docs_res.json().get("data", [])

    if not docs:
        pytest.skip("No approved doctors in database to test booking against.")

    doctor = docs[0]
    doctor_id = doctor["_id"]
    slot_id = uuid.uuid4().hex[:4]
    test_date = f"28-12-2030"
    test_time = f"{slot_id[:2]}:{slot_id[2:]}"

    # 1. First booking -> succeeds
    book_res1 = client.post(
        "/api/v1/user/book-appointment",
        json={
            "doctorId": doctor_id,
            "date": test_date,
            "time": test_time,
            "doctorInfo": doctor,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert book_res1.status_code == 200
    data1 = book_res1.json()
    assert data1.get("success") is True
    appt_id = data1["data"]["_id"]

    # 2. Duplicate booking attempt on the same slot -> MUST FAIL
    book_res2 = client.post(
        "/api/v1/user/book-appointment",
        json={
            "doctorId": doctor_id,
            "date": test_date,
            "time": test_time,
            "doctorInfo": doctor,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert book_res2.status_code == 200
    data2 = book_res2.json()
    assert data2.get("success") is False
    assert "Conflict" in data2.get("message", "") or "not available" in data2.get("message", "")

    # 3. Patient cancels the appointment
    cancel_res = client.post(
        "/api/v1/user/cancel-appointment",
        json={"appointmentId": appt_id, "status": "cancelled"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json().get("success") is True

    # 4. After cancellation, slot is available again!
    avail_res = client.post(
        "/api/v1/user/booking-availbility",
        json={"doctorId": doctor_id, "date": test_date, "time": test_time},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert avail_res.status_code == 200
    assert avail_res.json().get("success") is True


# ========================================================
# 5. Hospital Directory & Access Control
# ========================================================
def test_hospital_directory_and_access(client, unique_patient_credentials):
    """Test hospital listing and RBAC restriction for creating hospitals."""
    token = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    }).json()["token"]

    # All users can browse hospitals
    list_res = client.get("/api/v1/hospitals", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    hospitals = list_res.json().get("data", [])
    assert isinstance(hospitals, list)

    # Patients CANNOT create hospitals
    create_res = client.post(
        "/api/v1/hospitals",
        json={
            "name": "Fake Hospital",
            "address": "Nowhere",
            "services": ["Testing"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 403


# ========================================================
# 6. Notifications Lifecycle
# ========================================================
def test_notifications_lifecycle(client, unique_patient_credentials):
    """Test marking notifications as read and clearing them."""
    token = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    }).json()["token"]

    mark_res = client.post("/api/v1/user/get-all-notification", json={}, headers={"Authorization": f"Bearer {token}"})
    assert mark_res.status_code == 200
    assert mark_res.json().get("success") is True

    del_res = client.post("/api/v1/user/delete-all-notification", json={}, headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    assert del_res.json().get("success") is True


# ========================================================
# 7. Medical AI Chatbot
# ========================================================
def test_chatbot_endpoint(client, unique_patient_credentials):
    """Test medical AI chatbot endpoint."""
    token = client.post("/api/v1/user/login", json={
        "email": unique_patient_credentials["email"],
        "password": unique_patient_credentials["password"],
    }).json()["token"]

    chat_res = client.post(
        "/api/v1/chatbot/chat",
        json={
            "chatHistory": [
                {"role": "user", "parts": [{"text": "Hello Dr AI"}]}
            ]
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert chat_res.status_code in [200, 429]
    data = chat_res.json()
    assert "success" in data
