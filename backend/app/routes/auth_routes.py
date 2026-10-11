import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.security import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user
from app.rate_limiter import check_rate_limit
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfileUpdateRequest,
    ApiResponse,
)

logger = logging.getLogger("healthease.auth_routes")
router = APIRouter(prefix="/user", tags=["Authentication & User"])


@router.post("/register")
async def register(request: Request, body: UserRegisterRequest):
    """
    Public registration endpoint.
    Strict Security Rule: Only creates standard 'patient' accounts.
    Cannot assign admin or doctor roles via public registration.
    """
    # Rate limit: 5 registrations per minute per IP
    await check_rate_limit(request, key_prefix="register", max_requests=5, window_seconds=60)

    db = get_database()
    existing_user = await db.users.find_one({"email": body.email.lower()})
    if existing_user:
        return {"success": False, "message": "User Already Exist"}

    hashed_password = get_password_hash(body.password)
    user_doc = {
        "name": body.name.strip(),
        "email": body.email.lower().strip(),
        "password": hashed_password,
        "isAdmin": False,
        "isDoctor": False,
        "role": "patient",
        "notification": [],
        "seennotification": [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    result = await db.users.insert_one(user_doc)
    logger.info("New user registered successfully with ID: %s", result.inserted_id)
    return {"success": True, "message": "Register Successfully"}


@router.post("/login")
async def login(request: Request, body: UserLoginRequest):
    """
    User login endpoint.
    Validates credentials and issues signed JWT access token.
    Rate limited to 10 attempts per minute.
    """
    await check_rate_limit(request, key_prefix="login", max_requests=10, window_seconds=60)

    db = get_database()
    user = await db.users.find_one({"email": body.email.lower()})
    if not user:
        return {"success": False, "message": "User not found"}

    if not verify_password(body.password, user.get("password", "")):
        return {"success": False, "message": "Invalid Email or Password"}

    user_id_str = str(user["_id"])
    role = "admin" if user.get("isAdmin") else ("doctor" if user.get("isDoctor") else "patient")

    token_data = {
        "sub": user_id_str,
        "id": user_id_str,
        "email": user["email"],
        "role": role,
        "isAdmin": user.get("isAdmin", False),
        "isDoctor": user.get("isDoctor", False),
    }
    token = create_access_token(data=token_data)

    formatted_user = format_mongo_doc(user)
    if "password" in formatted_user:
        del formatted_user["password"]

    logger.info("User %s successfully logged in", body.email)
    return {
        "success": True,
        "message": "Login Success",
        "token": token,
        "data": formatted_user,
    }


@router.post("/getUserData")
@router.get("/getUserData")
@router.get("/me")
async def get_user_data(current_user: dict = Depends(get_current_user)):
    """Fetch profile data of the currently authenticated user."""
    return {"success": True, "data": current_user}


@router.post("/update-profile")
async def update_user_profile(
    body: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update profile information for the authenticated user."""
    db = get_database()
    user_id = current_user.get("_id") or current_user.get("id")
    update_fields = {"updatedAt": datetime.utcnow()}

    if body.name is not None and body.name.strip():
        update_fields["name"] = body.name.strip()
    if body.email is not None and body.email.strip():
        # Check email conflict
        existing = await db.users.find_one({
            "email": body.email.lower(),
            "_id": {"$ne": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id}
        })
        if existing:
            return {"success": False, "message": "Email is already taken by another user"}
        update_fields["email"] = body.email.lower().strip()

    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    await db.users.update_one(query, {"$set": update_fields})

    updated_user = await db.users.find_one(query)
    formatted = format_mongo_doc(updated_user)
    if "password" in formatted:
        del formatted["password"]

    return {
        "success": True,
        "message": "Profile Updated Successfully",
        "data": formatted,
    }
