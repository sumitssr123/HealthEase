# HealthEase — Smart Healthcare & Doctor Booking Platform

A modernized, high-performance, and resilient doctor appointment booking platform built with **FastAPI**, **React.js**, **MongoDB Atlas**, **Redis**, and **RabbitMQ**. HealthEase simplifies appointment scheduling while demonstrating modern backend system design patterns: caching, atomic rate limiting, asynchronous event messaging, database-level concurrency protection, and reverse-proxy load balancing.

---

## 1. Project Overview & System Design

HealthEase solves real-world clinic workflow problems with a streamlined and resilient technology stack:

- **Frontend (React.js)**: Clean, lightweight React with standard state and hooks. Complex Redux boilerplate and global state overhead have been eliminated in favor of a fast `AuthContext` and unified Axios HTTP client (`api.js`).
- **Backend (Python FastAPI)**: High-speed, asynchronous RESTful API featuring automatic OpenAPI/Swagger documentation, strict Pydantic schemas, and robust dependency-injected Role-Based Access Control (RBAC).
- **Database (MongoDB / MongoDB Atlas)**: Fully persistent document storage with connection pooling, index optimization, and partial unique indexes enforcing concurrency constraints directly in the database engine.
- **In-Memory Cache (Redis)**: Sub-millisecond caching for high-frequency, read-heavy data (approved doctor directory, individual doctor profiles, and hospital listings) with automatic cache invalidation upon doctor updates.
- **Rate Limiting (Redis Fixed-Window)**: Atomic rate limiting on critical endpoints (login, registration, chatbot queries, booking) to protect against credential stuffing, brute-force attacks, and API abuse. Includes graceful in-memory fallback.
- **Asynchronous Event Processing (RabbitMQ)**: Decoupled AMQP message broker. When appointments are booked or doctor applications are processed, FastAPI publishes lightweight event payloads to a durable queue, and a dedicated background worker asynchronously persists in-app notifications. If RabbitMQ is unavailable, a graceful synchronous fallback ensures zero data loss.
- **Reverse Proxy & Load Balancing (Nginx)**: Optional multi-instance deployment demonstrating round-robin traffic distribution across two independent FastAPI instances.
- **Preserved Medical Chatbot (Google Gemini)**: Clinical conversational assistant powered by Google Gemini with both microphone speech recognition (voice synthesis) and responsive text input, protected by strict clinical disclaimers.

---

## 2. Architecture & Request Flow

### System Architecture Diagram

```mermaid
flowchart TD
    Client["React Frontend (Port 3000)"]
    Nginx["Nginx Reverse Proxy / Load Balancer (Port 8080)"]
    FastAPI1["FastAPI Instance #1 (Port 8001 / App:8000)"]
    FastAPI2["FastAPI Instance #2 (Port 8002 / App:8000)"]
    Redis["Redis Cache & Rate Limiter (Port 6379)"]
    Mongo["MongoDB Atlas / Local DB (Port 27017)"]
    RMQ["RabbitMQ Message Broker (Port 5672)"]
    Worker["Notification Worker Process"]
    Gemini["Google Gemini Medical AI"]

    Client -->|API Requests| Nginx
    Client -.->|Direct Dev Mode| FastAPI1
    Nginx -->|Round Robin| FastAPI1
    Nginx -->|Round Robin| FastAPI2

    FastAPI1 -->|Check Cache & Rate Limits| Redis
    FastAPI1 -->|Query & Persist Data| Mongo
    FastAPI1 -->|Publish Event| RMQ
    FastAPI1 -->|AI Consultation| Gemini

    FastAPI2 -->|Check Cache & Rate Limits| Redis
    FastAPI2 -->|Query & Persist Data| Mongo
    FastAPI2 -->|Publish Event| RMQ

    RMQ -->|Consume Event| Worker
    Worker -->|Persist Notification| Mongo
```

### End-to-End Request Journey

1. **Patient Booking Request**:
   - The patient selects an approved doctor, chooses a date and time slot, and clicks **Book Now**.
   - React sends a `POST /api/v1/user/book-appointment` request with the Bearer JWT token in the `Authorization` header.
2. **FastAPI Validation & Concurrency Check**:
   - FastAPI verifies the JWT token via dependency injection (`get_current_user`), enforcing that only authenticated patients can book.
   - The rate limiter checks Redis to prevent automated bot spam.
   - FastAPI checks slot availability and inserts the appointment record into MongoDB.
   - **Double-Booking Protection**: A database-level partial unique index (`idx_appointments_double_booking_prevention`) on `{ "doctorId": 1, "date": 1, "time": 1 }` where `{ "status": "booked" }` guarantees that two concurrent requests for the exact same slot cannot both succeed. If a race condition occurs, MongoDB raises a duplicate key error (code `11000`), and FastAPI returns a clean HTTP `409 Conflict` error to the second user.
3. **Immediate Confirmation**:
   - Normal appointments are **immediately confirmed as `booked`**. There is no doctor approval delay for appointments.
4. **Asynchronous Notification Dispatch**:
   - FastAPI constructs a notification event payload and publishes it to the durable RabbitMQ exchange/queue (`healthease.notifications`).
   - The background worker consumes the event and writes in-app notification records to the patient's and doctor's notification feeds in MongoDB.
   - If RabbitMQ is offline or unconfigured, FastAPI's built-in broker cooldown fallback instantly writes the notification directly to MongoDB without delaying the user's booking response.

---

## 3. Roles and Permissions (RBAC)

HealthEase strictly enforces three roles at the backend layer:

| Role | Permissions & Access |
| :--- | :--- |
| **Patient** | Register & login; browse approved doctors; view doctor details; view hospital listings & map coordinates; book appointments (immediately confirmed); view own appointments; cancel own appointments; interact with Dr. AI Chatbot; receive notifications. |
| **Doctor** | Log in; manage professional profile (specialization, experience, fees, consultation hours); view own booked appointments; view patient contact details for appointments; create/update hospital listings; receive booking notifications. |
| **Admin** | View system-wide metrics (total users, approved doctors, pending applications, total appointments); inspect all users; review pending doctor applications; approve or reject doctor applications; manage hospital listings. |

> **Security Note**: Public registration only creates `patient` accounts. Administrator accounts can only be provisioned through the bootstrap configuration (`ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`), preventing privilege escalation.

---

## 4. Local Development Quickstart (Windows PowerShell)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- **MongoDB** (Local MongoDB on port 27017 or MongoDB Atlas connection string)
- *(Optional for Caching & Async Events)* **Docker Desktop** (for Redis and RabbitMQ)

---

### Step 1: Configure Environment Variables

Create your backend configuration file by copying the template:

```powershell
# Navigate to the backend directory
cd c:\study\HealthEase\backend

# Copy the example environment template
Copy-Item .env.example .env
```

Open `backend\.env` in your text editor and ensure the following keys are set:

```env
# MongoDB Connection (use local MongoDB or your Atlas URI)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=HealthEase

# Authentication
JWT_SECRET=healthease_super_secure_jwt_secret_key_2026_xyz
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Frontend URL for CORS
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

# Optional Services (default local Docker ports)
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Admin Bootstrap (automatically created on first startup)
ADMIN_EMAIL=admin@healthease.com
ADMIN_PASSWORD=AdminSecurePassword2026!

# Preserved Medical Chatbot (Google Gemini)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

### Step 2: Set Up and Start the FastAPI Backend

In your PowerShell terminal:

```powershell
cd c:\study\HealthEase\backend

# Create a Python virtual environment (if not already created)
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install required Python dependencies
pip install -r requirements.txt

# Start the FastAPI application with auto-reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Root**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Alternative Redoc Documentation**: `http://localhost:8000/redoc`
- **Liveness Health Check**: `http://localhost:8000/health`
- **Readiness Probe**: `http://localhost:8000/ready`

---

### Step 3: (Optional) Run the RabbitMQ Notification Worker

If you are running RabbitMQ and want background notification consumption:

```powershell
# In a separate PowerShell terminal
cd c:\study\HealthEase\backend
.\venv\Scripts\Activate.ps1

python worker.py
```

*(Note: If RabbitMQ is not running, notifications automatically save directly to MongoDB with zero errors.)*

---

### Step 4: Set Up and Start the React Frontend

Open a new PowerShell terminal:

```powershell
cd c:\study\HealthEase\client

# Install frontend dependencies
npm install

# Start the React development server
npm start
```

The browser will automatically open `http://localhost:3000`.

---

## 5. MongoDB Atlas Setup & Safe Data Migration

HealthEase works seamlessly with persistent **MongoDB Atlas** cloud storage.

### How to Set Up MongoDB Atlas

1. **Create an Account**: Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create or sign in to your free account.
2. **Create a Cluster**: Click **Build a Database** and select the free **M0 Shared** tier in your closest region.
3. **Create Database Credentials**:
   - In **Security > Database Access**, click **Add New Database User**.
   - Select **Password Authentication**.
   - Set a username (e.g., `healthease_user`) and a secure password.
   - Assign the **Read and write to any database** role.
4. **Configure Network Access**:
   - In **Security > Network Access**, click **Add IP Address**.
   - Add your current IP address (or click **Allow Access from Anywhere** `0.0.0.0/0` for initial development).
5. **Get Connection String**:
   - Click **Database > Connect > Drivers**.
   - Copy the connection URI:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
     ```
6. **Update `.env`**:
   In `backend/.env`, set:
   ```env
   MONGODB_URI=mongodb+srv://healthease_user:<your_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
   MONGODB_DB=HealthEase
   ```
7. **Restart the Backend**: Once restarted, all newly registered patients, doctors, hospitals, and bookings persist in the Atlas cloud.

---

### Safe Data Migration Tool (`scripts/migrate_to_atlas.py`)

HealthEase provides a dedicated, non-destructive migration script to sync collections from a local database to MongoDB Atlas:

```powershell
cd c:\study\HealthEase

# 1. Run a Dry Run first to inspect documents without writing anything
python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://<user>:<pwd>@cluster.mongodb.net" --dry-run

# 2. Run the actual migration (uses idempotent upserts preserving all ObjectIds)
python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://<user>:<pwd>@cluster.mongodb.net"
```

**Features of the migration script**:
- **Non-destructive**: Never drops, alters, or deletes any collection in the source or target databases.
- **Idempotent**: Uses `update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)` so it can be re-run safely anytime.
- **Index Rebuilding**: Re-creates all indexes including unique email constraints and double-booking prevention indexes on Atlas.

---

## 6. Redis Caching & Atomic Rate Limiting

### What Redis Does in HealthEase

1. **Directory Caching**: The public doctor directory (`/api/v1/user/getAllDoctors`) and hospital directory (`/api/v1/hospitals`) are cached in Redis with a 5-minute TTL (`300` seconds). This eliminates redundant database queries for read-heavy screens.
2. **Automatic Invalidation**: Whenever an approved doctor updates their profile or consultation hours (`/api/v1/doctor/updateProfile`), or an admin approves a new doctor, the doctor directory cache key is automatically invalidated.
3. **Atomic Rate Limiting**: Sensitive endpoints use Redis `INCR` and `EXPIRE` commands within a fixed window:
   - **Login**: Max 10 attempts per minute per IP address.
   - **Register**: Max 5 attempts per minute per IP address.
   - **Dr. AI Chatbot**: Max 20 queries per minute per IP address.

### Running Redis with Docker Compose

To spin up Redis locally:

```powershell
cd c:\study\HealthEase
docker compose up -d redis
```

### Managed Redis (Upstash / Redis Cloud)

If deploying to production, sign up for a free Redis instance on [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com) and update your `backend/.env`:

```env
REDIS_URL=rediss://default:your_password@your-endpoint.upstash.io:6379
```

> **Offline Resiliency**: If Redis is not running or unreachable, HealthEase logs a single warning and seamlessly falls back to querying MongoDB directly and using local in-memory rate limiting. No requests will fail!

---

## 7. RabbitMQ Background Event Notifications

### How It Works

```text
[Patient Books Slot]
       │
       ▼
[FastAPI saves booking to MongoDB]
       │
       ▼
[FastAPI publishes event to 'healthease.notifications']
       │
       ▼
[RabbitMQ Durable Queue]
       │
       ▼
[worker.py consumes event] ──> [Inserts notification in MongoDB] ──> [Worker ACK]
```

1. When an appointment is booked or cancelled, or an admin reviews a doctor application, FastAPI calls `publish_notification_event()`.
2. The event is pushed to the durable queue `healthease.notifications`.
3. `worker.py` consumes the message, saves the notification to MongoDB, and acknowledges the message (`ch.basic_ack`).
4. Duplicate messages are handled idempotently to prevent duplicate alerts.

### Running RabbitMQ

To start RabbitMQ with the Web Management Dashboard:

```powershell
cd c:\study\HealthEase
docker compose up -d rabbitmq
```

- **AMQP Protocol**: `amqp://guest:guest@localhost:5672/`
- **Web Console**: `http://localhost:15672` (Username: `guest`, Password: `guest`)

---

## 8. Reverse Proxy & Nginx Load Balancing

HealthEase includes a complete load balancing setup featuring two identical FastAPI instances behind an **Nginx** reverse proxy:

```powershell
cd c:\study\HealthEase

# Start the full cluster: 2 backend instances, Redis, RabbitMQ, Worker, and Nginx
docker compose up --build -d
```

### Testing the Load Balancer

1. Open `http://localhost:8080/lb-health` to check the Nginx load balancer status.
2. Send requests to `http://localhost:8080/health`. Nginx automatically alternates requests between `backend_1` (port 8001) and `backend_2` (port 8002) using round-robin distribution.
3. Access the full application through port `8080`.

To tear down the containers:

```powershell
docker compose down
```

---

## 9. Automated Testing Suite

HealthEase includes comprehensive automated tests covering all critical requirements:
- User registration and login
- JWT creation and validation
- Role-Based Access Control (Patient, Doctor, Admin)
- Doctor application submission and Admin approval workflow
- Immediate appointment booking confirmation
- **Concurrency & Double-Booking Prevention**: Verifies that duplicate booking requests for the same doctor and slot result in HTTP `409 Conflict`
- Appointment cancellation and slot release
- Cross-patient appointment isolation (Patient A cannot view Patient B's records)
- Hospital listings and Redis cache verification
- In-memory rate limiting enforcement
- Health and readiness probe validation

Run the tests using pytest:

```powershell
cd c:\study\HealthEase

# Run tests with verbose output
pytest tests/test_backend.py -v
```

All 10/10 automated tests pass cleanly!

---

## 10. Troubleshooting & FAQ

### 1. MongoDB Atlas Connection Failure (`ServerSelectionTimeoutError`)
- **Cause**: IP address not whitelisted in MongoDB Atlas.
- **Solution**: Go to MongoDB Atlas > **Network Access** > **Add IP Address** > Select **Allow Access from Anywhere** (`0.0.0.0/0`) or whitelist your current public IP.

### 2. Double-Booking Index Conflict (`IndexOptionsConflict`)
- **Cause**: An old index with the same keys exists with different options.
- **Solution**: The backend automatically manages and verifies indexes on startup. You can also run `python scripts/migrate_to_atlas.py` to ensure clean index creation.

### 3. Dr. AI Chatbot Returns "API Key Required"
- **Cause**: `GEMINI_API_KEY` is empty in `backend/.env`.
- **Solution**: Get a free API key from [Google AI Studio](https://aistudio.google.com/) and paste it into `backend/.env`. The backend uses model `gemini-2.5-flash`.

### 4. Port Conflicts (e.g., Port 8000 or 3000 already in use)
- **FastAPI**: Start on another port: `uvicorn app.main:app --port 8005 --reload` (and update `"proxy": "http://localhost:8005"` in `client/package.json`).
- **React**: React will automatically prompt to run on port 3001 if port 3000 is occupied.

---

## 11. Folder Structure

```text
HealthEase/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application root, CORS, lifespan, routes
│   │   ├── config.py            # Pydantic Settings & environment variables
│   │   ├── database.py          # Motor async client, collections, indexes, admin bootstrap
│   │   ├── security.py          # bcrypt password hashing, PyJWT creation & verification
│   │   ├── dependencies.py      # RBAC dependency injection (get_current_user, require_admin)
│   │   ├── schemas.py           # Pydantic request/response validation models
│   │   ├── cache.py             # Redis caching layer with fallback
│   │   ├── rate_limiter.py      # Redis atomic fixed-window rate limiter
│   │   ├── queue.py             # RabbitMQ event publisher with direct fallback
│   │   └── routes/
│   │       ├── auth_routes.py         # Login, register, profile update
│   │       ├── doctor_routes.py       # Doctor directory, applications, profile
│   │       ├── appointment_routes.py  # Immediate booking & slot cancellation
│   │       ├── hospital_routes.py     # Hospital directory & services
│   │       ├── admin_routes.py        # Admin stats & application review
│   │       ├── notification_routes.py # In-app notification center
│   │       └── chatbot_routes.py      # Google Gemini Dr. AI assistant
│   ├── worker.py                # Standalone RabbitMQ notification consumer
│   ├── requirements.txt         # Pinned Python dependencies
│   ├── Dockerfile               # Production container image for backend & worker
│   └── .env.example             # Documented environment variables template
├── client/
│   ├── src/
│   │   ├── api.js               # Centralized Axios client with JWT interceptor
│   │   ├── context/
│   │   │   └── AuthContext.js   # Lightweight React authentication state
│   │   ├── components/          # Reusable UI components (Layout, ProtectedRoute, etc.)
│   │   ├── pages/               # Application views (Home, Booking, HospitalPage, Chatbot, etc.)
│   │   ├── index.js             # React entry point with AuthProvider (no Redux)
│   │   └── App.js               # React Router navigation
│   └── package.json             # Frontend dependencies & proxy to port 8000
├── scripts/
│   └── migrate_to_atlas.py      # Idempotent MongoDB to Atlas migration script
├── nginx/
│   └── nginx.conf               # Nginx reverse proxy & round-robin load balancer
├── tests/
│   └── test_backend.py          # Pytest automated test suite
├── docker-compose.yml           # Multi-container orchestration (Redis, RMQ, 2x FastAPI, Nginx)
├── .gitignore                   # Ignores venvs, logs, secrets, and node_modules
└── README.md                    # This complete documentation
```

---

## 12. License & Author

Developed with care for modern healthcare accessibility. Open source under the MIT License.
