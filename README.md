# HealthEase — Complete Setup, Configuration, Execution and Troubleshooting Guide

This guide contains the exact operational steps to install prerequisites, obtain cloud credentials, configure environment variables, run the application, verify system design features, and resolve common development errors on Windows.

---

## 1. Installation and Downloads

### Required Tools and Services

| Tool / Service | Category | Download / Signup Link | Required? | Purpose in HealthEase |
|---|---|---|---|---|
| **Python 3.10+** (64-bit) | Local Software | [python.org/downloads](https://www.python.org/downloads/) | **Mandatory** | Runs the FastAPI backend, background notification worker, migration script, and test suite. |
| **Node.js 18+ & npm** | Local Software | [nodejs.org](https://nodejs.org/) | **Mandatory** | Builds and runs the React development server (`client`). |
| **Git for Windows** | Local Software | [git-scm.com](https://git-scm.com/download/win) | **Mandatory** | Clones repository, tracks changes, and manages versions. |
| **Visual Studio Code** | Local Software | [code.visualstudio.com](https://code.visualstudio.com/) | **Recommended** | Recommended code editor for editing Python and React files. |
| **Docker Desktop** | Local Software | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) | **Optional** | Runs containerized Redis, RabbitMQ, and the Nginx load balancer. *(Not required if using Cloud Redis/CloudAMQP or local fallbacks).* |
| **MongoDB Atlas** | Cloud Account | [mongodb.com/atlas](https://www.mongodb.com/atlas) | **Mandatory for Cloud DB** | Cloud-hosted MongoDB cluster for persistent data storage. *(Can use local MongoDB at `mongodb://localhost:27017` for offline dev).* |
| **Upstash (or Redis Cloud)** | Cloud Account | [upstash.com](https://upstash.com/) | **Optional for Cloud Cache** | Free serverless Redis for directory caching and atomic rate limiting. *(Docker local Redis can be used instead).* |
| **CloudAMQP** | Cloud Account | [cloudamqp.com](https://www.cloudamqp.com/) | **Optional for Cloud Queue** | Free hosted RabbitMQ message broker for asynchronous notifications. *(Docker local RabbitMQ can be used instead).* |
| **Google AI Studio** | Cloud Account | [aistudio.google.com](https://aistudio.google.com/) | **Optional for Chatbot** | Provides the API key for Dr. AI medical chatbot using model `gemini-2.5-flash`. |

---

### Verification of Local Installations

Open Windows PowerShell and run each verification command:

```powershell
# 1. Verify Python version (must be 3.10 or higher)
python --version
# Expected output: Python 3.11.x (or 3.10.x / 3.12.x)

# 2. Verify Node.js and npm
node -v
npm -v
# Expected output: v18.x.x or v20.x.x and 9.x.x or 10.x.x

# 3. Verify Git
git --version
# Expected output: git version 2.x.x.windows.x

# 4. Verify Docker Desktop (if installed)
docker --version
docker compose version
# Expected output: Docker version 24.x+ and Docker Compose version v2.x+
```

---

## 2. Environment Variables and URLs

### Complete Environment Variables Reference

All backend configurations are loaded through `backend/.env`.

| Variable | Required for | Where to obtain the value | Exact file location | Restart required? |
|---|---|---|---|---|
| `PROJECT_NAME` | API metadata | Fixed string: `HealthEase` | `backend/.env` | Yes |
| `API_V1_PREFIX` | Route prefix | Fixed string: `/api/v1` | `backend/.env` | Yes |
| `ENVIRONMENT` | Environment mode | `development` or `production` | `backend/.env` | Yes |
| `PORT` | FastAPI listen port | Integer: `8000` | `backend/.env` | Yes |
| `FRONTEND_ORIGIN` | CORS whitelist | `http://localhost:3000,http://localhost:5173` | `backend/.env` | Yes |
| `MONGODB_URI` | Database connection | Local: `mongodb://localhost:27017`<br>Atlas: `mongodb+srv://<user>:<pwd>@cluster.mongodb.net` | `backend/.env` | Yes |
| `MONGODB_DB` | Database name | Fixed string: `HealthEase` | `backend/.env` | Yes |
| `JWT_SECRET` | Authentication tokens | Generate a random 32+ character string (e.g. `HARRYPOTTER123456_healthease_secure_jwt_secret_key_2026`) | `backend/.env` | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | Integer in minutes: `1440` (24 hours) | `backend/.env` | Yes |
| `ALGORITHM` | JWT hashing algorithm | Fixed string: `HS256` | `backend/.env` | Yes |
| `ADMIN_NAME` | Initial admin bootstrap | Fixed string: `HealthEase Admin` | `backend/.env` | Yes |
| `ADMIN_EMAIL` | Initial admin login | Email: `admin@healthease.com` | `backend/.env` | Yes |
| `ADMIN_PASSWORD` | Initial admin login | Secure password: `Admin@HealthEase2026` | `backend/.env` | Yes |
| `REDIS_URL` | Caching & Rate Limiting | Local: `redis://localhost:6379/0`<br>Upstash: `rediss://default:<pwd>@<endpoint>.upstash.io:6379` | `backend/.env` | Yes |
| `REDIS_ENABLED` | Toggle Redis layer | Boolean: `true` or `false` | `backend/.env` | Yes |
| `CACHE_TTL_SECONDS` | Cache expiration | Integer in seconds: `300` (5 minutes) | `backend/.env` | Yes |
| `RABBITMQ_URL` | Async event broker | Local: `amqp://guest:guest@localhost:5672/`<br>CloudAMQP: `amqps://<user>:<pwd>@<host>/<vhost>` | `backend/.env` | Yes |
| `RABBITMQ_QUEUE` | Durable queue name | Fixed string: `healthease_notifications` | `backend/.env` | Yes |
| `GEMINI_API_KEY` | Dr. AI Chatbot | Google AI Studio > Get API key (starts with `AIzaSy...`) | `backend/.env` | Yes |
| `GEMINI_MODEL` | AI Chatbot model | Fixed string: `gemini-2.5-flash` | `backend/.env` | Yes |

---

### Safe Template (`backend/.env.example`)

Copy this template to create `backend/.env`:

```env
# Application Settings
PROJECT_NAME=HealthEase
API_V1_PREFIX=/api/v1
ENVIRONMENT=development
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

# MongoDB Settings (Local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=HealthEase

# Security & Authentication (Must be 32+ characters for HS256)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256

# Bootstrap Administrator Account
ADMIN_NAME=HealthEase Admin
ADMIN_EMAIL=admin@healthease.com
ADMIN_PASSWORD=Admin@HealthEase2026

# Redis Settings (Caching & Rate Limiting)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
CACHE_TTL_SECONDS=300

# RabbitMQ Settings (Background Notifications)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
RABBITMQ_QUEUE=healthease_notifications

# Medical AI Chatbot (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

> **Security Rule**: Never commit `backend/.env` to Git. The `.gitignore` file already excludes `backend/.env`, certificates (`*.pem`, `*.key`), and local secrets.

---

## 3. Complete Setup Instructions for Every Service

### A. MongoDB Atlas (Cloud Database)

1. **Create an Atlas Cluster**:
   - Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in.
   - Click **Create Deployment** > select **M0 Shared** (Free Tier).
   - Select cloud provider (AWS/GCP) and region closest to you (e.g. `Mumbai (ap-south-1)`).
   - Name the cluster (e.g., `HealthEaseCluster`) and click **Create**.
2. **Create Database User**:
   - In the left sidebar, click **Security > Database Access**.
   - Click **Add New Database User**.
   - Select **Password Authentication**.
   - Enter a Username (e.g., `healthease_user`) and a secure password.
   - Set privileges to **Read and write to any database**.
   - Click **Add User**.
3. **Configure Network Access (IP Whitelist)**:
   - In the left sidebar, click **Security > Network Access**.
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) for seamless development.
   - Click **Confirm** and wait ~30 seconds until status shows **Active**.
4. **Copy Connection String**:
   - Go to **Database > Clusters** > click **Connect**.
   - Select **Drivers** (Python).
   - Copy the URI:
     ```text
     mongodb+srv://healthease_user:<password>@healtheasecluster.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
     ```
   - Replace `<password>` with your database user password.
   - Paste into `backend/.env`:
     ```env
     MONGODB_URI=mongodb+srv://healthease_user:MySecurePassword@healtheasecluster.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
     MONGODB_DB=HealthEase
     ```
5. **Migrate Local MongoDB Data (Safe & Idempotent)**:
   If you have local records in `mongodb://localhost:27017` to migrate:
   ```powershell
   # Dry run first (validates without writing)
   python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://healthease_user:MySecurePassword@healtheasecluster.xxxx.mongodb.net" --dry-run

   # Perform actual safe migration (upserts preserving ObjectIds)
   python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://healthease_user:MySecurePassword@healtheasecluster.xxxx.mongodb.net"
   ```

---

### B. Redis (Caching & Rate Limiting)

Redis caches doctor directories and enforces atomic rate limiting on login (10/min), register (5/min), and chatbot (20/min).

- **Option 1: Local Docker Redis**:
  ```powershell
  docker run -d --name healthease-redis -p 6379:6379 redis:7-alpine
  ```
  `backend/.env`: `REDIS_URL=redis://localhost:6379/0`
- **Option 2: Cloud Redis on Upstash (Free Serverless)**:
  1. Visit [upstash.com](https://upstash.com/) and sign in.
  2. Click **Create Database** > Name: `healthease-redis` > Choose your region.
  3. Under **Connect to your database**, click **redis-py** and copy the URL:
     `rediss://default:xxxx@your-endpoint.upstash.io:6379`
  4. Paste into `backend/.env`:
     ```env
     REDIS_URL=rediss://default:xxxx@your-endpoint.upstash.io:6379
     ```
- **Fallback Behavior**: If Redis is offline or unreachable, HealthEase automatically falls back to MongoDB queries and local in-memory rate limiting. No API requests will fail.

---

### C. RabbitMQ (Message Broker)

RabbitMQ manages asynchronous in-app notification processing when bookings or status updates occur.

- **Option 1: Local Docker RabbitMQ**:
  ```powershell
  docker run -d --name healthease-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine
  ```
  - AMQP Port: `5672` (`amqp://guest:guest@localhost:5672/`)
  - Web Management UI: `http://localhost:15672` (Username: `guest`, Password: `guest`)
- **Option 2: Cloud RabbitMQ on CloudAMQP (Free Little Lemur Plan)**:
  1. Visit [cloudamqp.com](https://www.cloudamqp.com/) and sign in.
  2. Click **Create New Instance** > Plan: **Little Lemur (Free)** > Select region.
  3. Open the instance details and copy the **AMQP URL**:
     `amqps://username:password@server.cloudamqp.com/vhost`
  4. Paste into `backend/.env`:
     ```env
     RABBITMQ_URL=amqps://username:password@server.cloudamqp.com/vhost
     ```
- **Fallback Behavior**: If RabbitMQ is offline, FastAPI automatically saves notification records directly to MongoDB without delaying the booking confirmation response.

---

### D. Background Worker

The background worker (`worker.py`) consumes events from the durable queue `healthease_notifications` and saves in-app notification documents to MongoDB.

- **How to Run**:
  Open a dedicated PowerShell terminal:
  ```powershell
  cd c:\study\HealthEase\backend
  .\venv\Scripts\python.exe worker.py
  ```
- **How to Verify**:
  When a patient books an appointment, the worker log will output:
  ```text
  [INFO] Consumed notification event 'appointment-booked' for recipient 65f...
  [INFO] Notification persisted to MongoDB. Acknowledging message.
  ```

---

### E. Docker and Docker Compose

HealthEase includes a multi-service `docker-compose.yml` for running the entire infrastructure:

```yaml
services:
  redis:        # Port 6379: In-memory cache & rate limiter
  rabbitmq:     # Ports 5672 (AMQP) & 15672 (Management UI)
  backend_1:    # Port 8001: FastAPI application instance #1
  backend_2:    # Port 8002: FastAPI application instance #2
  worker:       # Notification worker container
  nginx_proxy:  # Port 8080: Reverse proxy & load balancer
```

#### Exact Docker Commands:
```powershell
# 1. Start all containerized services in background
docker compose up -d

# 2. Check running container status and health
docker compose ps

# 3. View live logs of a specific service
docker compose logs -f backend_1
docker compose logs -f worker

# 4. Restart a specific service
docker compose restart redis

# 5. Stop all containers safely (preserves database volumes)
docker compose stop

# 6. Tear down containers and networks
docker compose down

# WARNING: Only use -v if you want to wipe local Redis and RabbitMQ volumes:
# docker compose down -v
```

---

### F. Nginx and Load Balancing

The load balancer demonstrates high availability by distributing traffic across two independent FastAPI instances.

- **Configuration File**: `nginx/nginx.conf`
- **Upstream Cluster**:
  ```nginx
  upstream healthease_backend {
      server backend_1:8000 max_fails=3 fail_timeout=10s;
      server backend_2:8000 max_fails=3 fail_timeout=10s;
  }
  ```
- **How to Start**:
  ```powershell
  docker compose up --build -d
  ```
- **How to Verify**:
  1. Open `http://localhost:8080/lb-health` (returns `{"status":"UP","balancer":"nginx"}`).
  2. Open `http://localhost:8080/health`. Nginx automatically alternates requests between `backend_1` and `backend_2` using round-robin scheduling.
  3. Normal local development uses the standalone FastAPI instance at `http://localhost:8000`.

---

### G. Chatbot and Maps

1. **Dr. AI Medical Chatbot (Google Gemini)**:
   - Provider: Google Gemini API via `gemini-2.5-flash`.
   - Setup: Get key from [aistudio.google.com](https://aistudio.google.com/) and paste into `GEMINI_API_KEY` in `backend/.env`.
   - Features: Supports voice speech recognition, audio synthesis, and responsive text input with clinical safety disclaimers.
   - Endpoint: `POST /api/v1/chatbot/chat`.
2. **Interactive Maps (Google Maps Embed)**:
   - Integrated in `BookingPage.js` and `HospitalPage.js`.
   - Uses standard Google Maps Embed (`maps.google.com/maps?q=lat,lng&output=embed`).
   - Does **not** require a paid API key or billing account. Coordinates are saved on doctor and hospital records in MongoDB.

---

## 4. First-Time Setup: Exact Execution Order

Follow this exact sequence to set up the project from scratch on Windows:

1. **Install Prerequisites**: Verify Python 3.10+, Node.js 18+, Git, and VS Code.
2. **Create Environment File**:
   ```powershell
   cd c:\study\HealthEase\backend
   Copy-Item .env.example .env
   ```
3. **Configure Credentials in `backend/.env`**:
   - Set `MONGODB_URI` (Atlas connection string or local MongoDB).
   - Set `JWT_SECRET` (at least 32 characters).
   - Set `GEMINI_API_KEY` (from Google AI Studio).
4. **Prepare Python Virtual Environment**:
   ```powershell
   cd c:\study\HealthEase\backend
   python -m venv venv --system-site-packages
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
5. **Start the FastAPI Backend**:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *(Verify `http://127.0.0.1:8000/health` returns status 200 `healthy`).*
6. **Start the Notification Worker (Optional)**:
   In a second terminal:
   ```powershell
   cd c:\study\HealthEase\backend
   .\venv\Scripts\python.exe worker.py
   ```
7. **Install Frontend Dependencies & Start React**:
   In a third terminal:
   ```powershell
   cd c:\study\HealthEase\client
   npm install
   npm start
   ```
8. **Open Application**:
   Navigate to `http://localhost:3000` in your browser.
9. **Verify Features**:
   - Register a new patient at `/register`.
   - Log in with `admin@healthease.com` / `Admin@HealthEase2026` at `/login`.
   - Book an appointment and verify it appears immediately in the patient and doctor dashboards.

---

## 5. Normal Daily Startup and Shutdown

### Startup (3 Terminals)

```powershell
# Terminal 1: Backend API (Port 8000)
cd c:\study\HealthEase\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: React Frontend (Port 3000)
cd c:\study\HealthEase\client
npm start

# Terminal 3: Notification Worker (Optional)
cd c:\study\HealthEase\backend
.\venv\Scripts\python.exe worker.py
```

### Shutdown

1. In Terminals 1, 2, and 3, press `Ctrl + C`.
2. If Docker containers were running, execute:
   ```powershell
   docker compose stop
   ```

---

## 6. How to Fix Red Errors & VS Code Squiggles

If you see red underlines in `admin_routes.py`, `main.py`, or other Python files in VS Code:

### Cause 1: Python Interpreter Not Selected
VS Code defaults to global Windows Python instead of the virtual environment.
- **Fix**:
  1. Press `Ctrl + Shift + P` in VS Code.
  2. Type: `Python: Select Interpreter`.
  3. Select: `c:\study\HealthEase\backend\venv\Scripts\python.exe`.

### Cause 2: PyLance Search Paths (Resolved via `.vscode/settings.json`)
VS Code opened at the root directory doesn't include `./backend` in PyLance search paths, causing `from app...` to show red squiggles.
- **Fix**: We created `.vscode/settings.json` in the project root:
  ```json
  {
    "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/Scripts/python.exe",
    "python.analysis.extraPaths": ["${workspaceFolder}/backend"],
    "python.autoComplete.extraPaths": ["${workspaceFolder}/backend"]
  }
  ```
  *(Reload VS Code window with `Ctrl + Shift + P` > `Developer: Reload Window` to apply).*

### Cause 3: Port 8000 Already in Use (`[Errno 10048]`)
A previous Uvicorn process is still holding the port.
- **Fix**:
  ```powershell
  # Find and stop the process holding port 8000
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force
  ```

---

## 7. Troubleshooting Reference

| Error or Symptom | How to Check | Likely Cause | Exact Solution |
|---|---|---|---|
| `Import "app.xxx" could not be resolved` | Check VS Code Problems tab | PyLance extra paths missing | Ensure `.vscode/settings.json` has `extraPaths: ["${workspaceFolder}/backend"]` and reload VS Code. |
| `[Errno 10048] address already in use: 8000` | Terminal output on Uvicorn start | Background Python process holding port 8000 | Run: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force`. |
| `ServerSelectionTimeoutError` | Uvicorn logs on startup | MongoDB Atlas IP not whitelisted | In MongoDB Atlas > Network Access, add `0.0.0.0/0` (Allow from anywhere) and wait 30 seconds. |
| `Redis connection failed (Timeout)` | Uvicorn logs on startup | Local Redis container not running | Start Redis (`docker compose up -d redis`) or let HealthEase run with its built-in database fallback. |
| `RabbitMQ broker disconnected` | Worker terminal output | RabbitMQ container not running | Start RabbitMQ (`docker compose up -d rabbitmq`) or let FastAPI save notifications directly to MongoDB. |
| `CORS Error in Browser Console` | F12 Developer Tools > Network tab | Frontend port not in CORS origin | Add your frontend port to `FRONTEND_ORIGIN` in `backend/.env` (default allows `http://localhost:3000`). |
| `InsecureKeyLengthWarning (JWT)` | Terminal output | `JWT_SECRET` shorter than 32 bytes | Ensure `JWT_SECRET` in `backend/.env` has at least 32 characters. |
| `Duplicate slot error: 409 Conflict` | Network tab on booking | Slot is already booked by another user | Normal behavior: double-booking prevention prevented a collision. Select another time slot. |
| `Chatbot returns 500 or key error` | Network tab on `/api/v1/chatbot/chat` | `GEMINI_API_KEY` is missing or invalid | Get a free API key from [aistudio.google.com](https://aistudio.google.com/) and update `backend/.env`. |

---

## 8. Complete Feature Setup and Testing Checklist

Follow this checklist to test all working features:

| Feature | How to Test | Expected Result | Configuration Needed |
|---|---|---|---|
| **Health Probe** | Open `http://localhost:8000/health` | HTTP 200 `{"status": "healthy"}` | None |
| **Swagger Docs** | Open `http://localhost:8000/docs` | Interactive API documentation | None |
| **Patient Registration** | Submit form at `/register` | Account created; redirects to `/login` | MongoDB |
| **User Login** | Submit credentials at `/login` | JWT stored in localStorage; redirect to `/dashboard` | MongoDB |
| **RBAC Route Guard** | Patient calls `/api/v1/admin/getAllUsers` | HTTP 403 Forbidden | Valid Patient JWT |
| **Doctor Application** | Patient submits form at `/apply-doctor` | Status `pending`; notification sent to Admin | MongoDB |
| **Admin Approval** | Admin clicks Approve at `/admin/doctors` | Status changes to `approved`; doctor appears in directory | Admin Login |
| **Doctor Directory** | Open `/dashboard` | Approved doctors rendered with fees and location | MongoDB / Redis |
| **Appointment Booking** | Patient selects date/time at `/doctor/book-appointment/:id` | Immediate confirmation (`booked`); visible in dashboard | MongoDB |
| **Double-Booking Guard** | Second patient tries booking the same doctor and slot | Database rejects duplicate; API returns HTTP 409 Conflict | MongoDB Unique Index |
| **Slot Cancellation** | Patient clicks Cancel on `/appointments` | Status changes to `cancelled`; slot is freed | MongoDB |
| **Hospital Listings** | Open `/hospitals` | Hospital cards with service tags and location details | MongoDB / Redis |
| **Interactive Map** | Click View on Map on hospital or booking page | Google Maps embed modal displays accurate pin | None (Embed API) |
| **Dr. AI Chatbot** | Type query or use mic on `/chatbot` | Medical guidance response with clinical disclaimer | `GEMINI_API_KEY` |
| **In-App Notifications** | Click Bell icon at `/notification` | Unread & Read notification tabs with Mark All Read | MongoDB |
| **Redis Caching** | Call `/api/v1/user/getAllDoctors` twice | Second call served from Redis cache in <2ms | Redis |
| **Automated Tests** | Run `pytest tests/test_backend.py -v` | 10 passed out of 10 tests | None |

---

## 9. Where Each Technology and System Design Concept Is Used

| Technology or Concept | Actual File / Function | What It Does in HealthEase | How to Run or Verify It |
|---|---|---|---|
| **FastAPI Framework** | `backend/app/main.py` | Asynchronous RESTful API with auto-generated OpenAPI documentation and CORS middleware. | Visit `http://localhost:8000/docs` |
| **JWT Authentication** | `backend/app/security.py`<br>`create_access_token()`, `verify_token()` | Issues and validates signed HMAC SHA256 tokens for session authentication. | Inspect token payload in browser localStorage |
| **Role-Based Access Control** | `backend/app/dependencies.py`<br>`require_admin()`, `require_doctor()` | Enforces permissions across Patient, Doctor, and Admin roles at the API layer. | Attempt accessing `/admin/users` as patient (returns 403) |
| **Motor Async Driver** | `backend/app/database.py`<br>`get_database()` | Non-blocking MongoDB client enabling high-concurrency database I/O. | Handled automatically during all API queries |
| **Double-Booking Prevention** | `backend/app/database.py`<br>`idx_appointments_double_booking_prevention` | Partial unique database index on `{ doctorId, date, time }` where `{ status: "booked" }`. Prevents race conditions. | Run `pytest tests/test_backend.py -k test_appointment_booking` |
| **Redis Directory Caching** | `backend/app/cache.py`<br>`get_json()`, `set_json()` | Caches approved doctor and hospital directories with a 5-minute TTL to reduce database load. | Request `/api/v1/user/getAllDoctors` (cached on 2nd call) |
| **Redis Cache Invalidation** | `backend/app/cache.py`<br>`invalidate_doctors()` | Automatically purges directory cache whenever doctor profiles or approval statuses are updated. | Update doctor profile; verify fresh directory load |
| **Redis Atomic Rate Limiting** | `backend/app/rate_limiter.py`<br>`check_rate_limit()` | Fixed-window rate limiter using atomic `INCR` and `EXPIRE` commands (Login: 10/min, Register: 5/min, Chatbot: 20/min). | Send 11 rapid login attempts (returns 429 Too Many Requests) |
| **RabbitMQ Event Publishing** | `backend/app/queue.py`<br>`publish_notification_event()` | Publishes lightweight notification events to the durable queue `healthease_notifications`. | Book an appointment; inspect RabbitMQ management UI |
| **RabbitMQ Background Worker** | `backend/worker.py`<br>`main()` | Standalone background process consuming queue events and persisting in-app notifications with manual acknowledgments. | Run `python worker.py` in terminal |
| **Nginx Reverse Proxy & Load Balancer** | `nginx/nginx.conf`<br>`upstream healthease_backend` | Distributes incoming HTTP traffic across two identical FastAPI instances (`backend_1` and `backend_2`) via round-robin. | Run `docker compose up -d` and check `http://localhost:8080/lb-health` |
| **Operational Probes** | `backend/app/main.py`<br>`/health`, `/ready` | Liveness and readiness endpoints verifying application uptime and dependency connectivity. | Visit `http://localhost:8000/ready` |
| **Medical AI Chatbot** | `backend/app/routes/chatbot_routes.py` | Conversational medical assistant using Google Gemini with clinical disclaimers. | Test via `/chatbot` page |
| **Interactive Map Integration** | `client/src/pages/HospitalPage.js`<br>`client/src/pages/BookingPage.js` | Embedded Google Maps iframe displaying hospital and clinic locations from coordinates. | Click "View on Map" on hospital card |
| **React State & Auth Context** | `client/src/context/AuthContext.js`<br>`client/src/api.js` | Lightweight React authentication state and centralized Axios client replacing complex Redux boilerplate. | Log in and inspect instant role-based UI updates |
