from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# ==========================================
# Common Response Wrapper
# ==========================================
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


# ==========================================
# User & Authentication Schemas
# ==========================================
class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


class LoginResponseData(BaseModel):
    token: str
    user: Dict[str, Any]


class UserProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


# ==========================================
# Doctor Schemas
# ==========================================
class DoctorApplyRequest(BaseModel):
    firstName: str = Field(..., min_length=1)
    lastName: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=5)
    email: str = Field(..., min_length=3)
    website: Optional[str] = None
    address: str = Field(..., min_length=3)
    specialization: str = Field(..., min_length=2)
    experience: str = Field(..., min_length=1)
    feesPerCunsultation: float = Field(..., ge=0)
    timings: Any = None  # Accepts list of times or object


class DoctorProfileUpdateRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[str] = None
    feesPerCunsultation: Optional[float] = None
    timings: Optional[Any] = None


# ==========================================
# Appointment Schemas
# ==========================================
class CheckAvailabilityRequest(BaseModel):
    doctorId: str
    date: str
    time: str


class BookAppointmentRequest(BaseModel):
    doctorId: str
    date: str
    time: str
    doctorInfo: Optional[Dict[str, Any]] = None
    userInfo: Optional[Dict[str, Any]] = None


# ==========================================
# Hospital Schemas
# ==========================================
class HospitalCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    address: str = Field(..., min_length=3)
    description: Optional[str] = ""
    services: List[str] = Field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact: Optional[str] = ""


class HospitalUpdateRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    services: Optional[List[str]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact: Optional[str] = None


# ==========================================
# Admin Schemas
# ==========================================
class ChangeAccountStatusRequest(BaseModel):
    doctorId: str
    status: str  # "approved" or "rejected"
    userId: Optional[str] = None


class BlockUserRequest(BaseModel):
    blockId: str


# ==========================================
# Chatbot Schemas
# ==========================================
class ChatPart(BaseModel):
    text: str


class ChatMessage(BaseModel):
    role: str
    parts: List[ChatPart]


class ChatbotRequest(BaseModel):
    chatHistory: List[ChatMessage]
