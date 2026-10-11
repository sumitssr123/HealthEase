import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from bson import ObjectId

from app.database import get_database, format_mongo_doc
from app.security import decode_access_token

logger = logging.getLogger("healthease.dependencies")


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Dependency to validate JWT from Authorization header and return active user.
    Supports both 'Bearer <token>' and raw '<token>' headers.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
    elif len(parts) == 1:
        token = parts[0]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user ID (check both 'sub' and legacy 'id')
    user_id = payload.get("sub") or payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity",
        )

    db = get_database()
    query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
    user = await db.users.find_one(query)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
        )

    formatted = format_mongo_doc(user)
    # Never expose password hash downstream
    if "password" in formatted:
        del formatted["password"]

    return formatted


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Enforce Administrator role permission."""
    is_admin = current_user.get("isAdmin", False) or current_user.get("role") == "admin"
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required",
        )
    return current_user


async def require_doctor(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Enforce Approved Doctor role permission."""
    is_doctor = current_user.get("isDoctor", False) or current_user.get("role") == "doctor"
    if not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Approved Doctor privileges required",
        )
    return current_user
