# HealthEase — Backend Microservice & API Engine

The HealthEase backend is an asynchronous, high-performance REST API built on **FastAPI**, **Python 3.11**, and **Motor (async MongoDB driver)**, augmented by **Redis** (in-memory caching and distributed rate limiting), **RabbitMQ** (asynchronous event-driven notifications), and **Google Gemini** (conversational medical triage).

---

## 1. Directory Structure

```text
backend/
├── Dockerfile                  # Python 3.11-slim container specification
├── requirements.txt            # Python dependencies (FastAPI, Motor, PyMongo, Redis, Pika, etc.)
├── worker.py                   # Standalone RabbitMQ background notification consumer daemon
├── .env                        # Local environment variables (DB URIs, secrets, API keys)
└── app/
    ├── __init__.py             # Package marker
    ├── config.py               # Pydantic v2 Settings class & environment configuration
    ├── database.py             # Motor async database client, indexes, bootstrap admin & fallback
    ├── security.py             # bcrypt password hashing & PyJWT token generation/decoding
    ├── dependencies.py         # Request dependencies: get_current_user, require_admin, require_doctor
    ├── cache.py                # Redis caching client with active cache invalidation
    ├── rate_limiter.py         # Atomic Redis-backed rate limiter with in-memory fallback
    ├── queue.py                # RabbitMQ AMQP notification publisher with direct-to-DB fallback
    ├── schemas.py              # Pydantic request and response models
    ├── main.py                 # FastAPI application factory, lifespan, CORS, /health & /ready
    └── routes/                 # Decoupled REST API route modules
        ├── __init__.py         # Package marker
        ├── auth_routes.py      # Registration, login, /getUserData, profile updates
        ├── doctor_routes.py    # Doctor application, directory listing (cached), profile updates
        ├── appointment_routes.py # Availability checks, atomic slot booking, status updates
        ├── hospital_routes.py  # Hospital catalog CRUD with coordinate mapping
        ├── admin_routes.py     # System stats, doctor credential approval/rejection, user blocking
        ├── notification_routes.py # In-app notification retrieval, mark-as-read, delete-read
        └── chatbot_routes.py   # Google Gemini conversational AI integration with rate-limiting
```

---

## 2. Core Architectural Components

### 2.1 Asynchronous Database Layer (`app/database.py`)
- **Non-Blocking I/O:** Utilizes `Motor` (`AsyncIOMotorClient`) running on Python's `asyncio` event loop.
- **Connection Pooling:** Configured with `minPoolSize=10` and `maxPoolSize=50` to maintain hot connections.
- **Atlas-to-Local Fallback:** Tries to connect to MongoDB Atlas (`mongodb+srv://`) with `certifi` TLS certificate validation. If Atlas is unreachable (e.g. dynamic IP not whitelisted or offline development), automatically falls back to `mongodb://localhost:27017`.
- **Database-Level Concurrency Guard:** Builds a partial unique index on `appointments`:
  ```python
  IndexModel(
      [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
      unique=True,
      partialFilterExpression={"status": "booked"},
      name="idx_appointments_double_booking_prevention",
  )
  ```
- **Automated Administrator Bootstrap:** Automatically runs an idempotent upsert (`$setOnInsert` and `$set`) ensuring the administrator account (`admin@healthease.com`) exists without requiring manual database seeding.

### 2.2 Security & Role-Based Access Control (`app/security.py`, `app/dependencies.py`)
- **Password Hashing:** Passwords are salted and hashed using `bcrypt` with work factor 12.
- **Stateless Authentication:** Issues HMAC-SHA256 JWT access tokens carrying claims (`sub`, `id`, `email`, `role`, `isAdmin`, `isDoctor`, `exp`). Expiration defaults to 24 hours (1440 minutes).
- **FastAPI Dependency Guards:**
  - `get_current_user`: Extracts token from `Authorization: Bearer <token>` or raw `<token>`, verifies signature, queries MongoDB, and strips password hash.
  - `require_admin`: Verifies `isAdmin == True` or `role == "admin"`. Rejects non-admins with HTTP 403 Forbidden.
  - `require_doctor`: Verifies `isDoctor == True` or `role == "doctor"`. Rejects unverified doctors with HTTP 403 Forbidden.

### 2.3 Redis Caching & Cache Invalidation (`app/cache.py`)
- **Directory Caching:** Approved doctor directory (`healthease:doctors:approved`) and hospital listings (`healthease:hospitals:all`) are cached in Redis with a 300-second TTL.
- **Active Invalidation:** Explicitly purges cache keys when mutations occur (doctor approvals, profile updates, hospital additions).
- **Circuit Breaker:** If Redis is down, caching transparently falls back to direct database reads without crashing.

### 2.4 Distributed Atomic Rate Limiting (`app/rate_limiter.py`)
- **Atomic Pipelines:** Uses Redis `INCR` + `EXPIRE` pipelines to enforce rate limits:
  - Registration: 5 requests / minute
  - Login: 10 requests / minute
  - Appointment Booking: 10 requests / minute
  - AI Chatbot: 20 requests / minute
- **In-Memory Fallback:** If Redis is offline, seamlessly transitions to an in-memory sliding window dictionary.

### 2.5 Event-Driven Notifications & Background Worker (`app/queue.py`, `worker.py`)
- **RabbitMQ Publisher:** Decouples notification delivery from HTTP request execution by publishing persistent JSON messages (`delivery_mode=2`) to the durable `healthease_notifications` queue.
- **Worker Daemon (`worker.py`):** Standalone consumer running `basic_qos(prefetch_count=1)`. Consumes notification events, writes them to MongoDB, and manually sends `basic_ack`.
- **Direct Database Fallback:** If RabbitMQ is unavailable, `queue.py` automatically falls back to synchronous MongoDB persistence via `persist_notification_direct()` with a 60-second retry cooldown.

### 2.6 Medical AI Assistant "Dr. AI" (`app/routes/chatbot_routes.py`)
- **Direct REST Calls:** Uses `httpx.AsyncClient(timeout=30.0)` to communicate with Google's Generative Language API.
- **Model Fallback:** Primary model `gemini-2.5-flash` with automatic fallback to `gemini-1.5-flash`.
- **Clinical System Instructions:** Enforces friendly tone, no medical jargon, no emojis, concise 1-3 sentence answers, maximum 1-2 clarifying questions, practical home/medicine solutions, and emergency disclaimers.

---

## 3. API Route Catalog

| Router Module | Path Prefix | Primary Operations |
|---|---|---|
| `auth_routes.py` | `/api/v1/user` | `/register`, `/login`, `/getUserData`, `/me`, `/update-profile` |
| `doctor_routes.py` | `/api/v1/doctor`, `/api/v1/user` | `/apply-doctor`, `/getAllDoctors`, `/getDoctorById`, `/getDoctorInfo`, `/updateProfile`, `/doctor-appointments` |
| `appointment_routes.py` | `/api/v1/user`, `/api/v1/doctor` | `/booking-availbility`, `/book-appointment`, `/user-appointments`, `/cancel-appointment`, `/update-status` |
| `hospital_routes.py` | `/api/v1/hospitals` | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}` |
| `admin_routes.py` | `/api/v1/admin` | `/stats`, `/getAllUsers`, `/getAllDoctors`, `/changeAccountStatus`, `/blockUser` |
| `notification_routes.py` | `/api/v1/user` | `/notifications`, `/get-all-notification`, `/delete-all-notification` |
| `chatbot_routes.py` | `/api/v1/chatbot` | `/chat` |
| Operational Probes | `/` | `/health` (liveness), `/ready` (readiness), `/docs` (Swagger UI), `/redoc` |

---

## 4. Local Setup & Execution

### 1. Virtual Environment & Dependencies
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)
Create or edit `.env` in the `backend/` directory:
```env
PROJECT_NAME=HealthEase
API_V1_PREFIX=/api/v1
ENVIRONMENT=development
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=HealthEase

JWT_SECRET=your_secure_random_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

ADMIN_NAME="HealthEase Admin"
ADMIN_EMAIL=admin@healthease.com
ADMIN_PASSWORD=your_admin_password_123

REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
CACHE_TTL_SECONDS=300

RABBITMQ_URL=amqp://guest:guest@localhost:5672/
RABBITMQ_QUEUE=healthease_notifications

GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Start FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation: `http://localhost:8000/docs`

### 4. Start Background Worker Daemon (Separate Terminal)
```bash
python worker.py
```

### 5. Run Automated Tests
```bash
# From workspace root:
pytest tests/test_backend.py -v
```
