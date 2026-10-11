import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt

from app.config import settings

logger = logging.getLogger("healthease.security")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    try:
        if not plain_password or not hashed_password:
            return False
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as exc:
        logger.error("Error verifying password: %s", exc)
        return False


def get_password_hash(password: str) -> str:
    """Hash a password securely using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token containing user identity and roles."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Ensure both 'id' and 'sub' are present for full backward/forward compatibility
    if "sub" in to_encode and "id" not in to_encode:
        to_encode["id"] = to_encode["sub"]
    elif "id" in to_encode and "sub" not in to_encode:
        to_encode["sub"] = to_encode["id"]

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT Token has expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid JWT Token: %s", exc)
        return None
