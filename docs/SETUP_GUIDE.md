# HealthEase Cloud Infrastructure & Complete Setup Guide

A complete, beginner-friendly operational guide for configuring, deploying, and running HealthEase with **MongoDB Atlas**, **Cloud Redis**, **Cloud RabbitMQ**, and **Google Gemini AI**.

---

## Table of Contents
1. [Prerequisites & Repository Structure](#1-prerequisites--repository-structure)
2. [MongoDB Atlas Cloud Setup (Step-by-Step)](#2-mongodb-atlas-cloud-setup-step-by-step)
3. [Cloud Redis Setup (Upstash / Redis Cloud)](#3-cloud-redis-setup-upstash--redis-cloud)
4. [Cloud RabbitMQ Setup (CloudAMQP)](#4-cloud-rabbitmq-setup-cloudamqp)
5. [Google Gemini Medical AI Setup](#5-google-gemini-medical-ai-setup)
6. [Local Environment Configuration (.env)](#6-local-environment-configuration-env)
7. [Starting the Application (PowerShell Instructions)](#7-starting-the-application-powershell-instructions)
8. [Docker Compose & Load Balancer (Nginx)](#8-docker-compose--load-balancer-nginx)
9. [How to Fix "Red Errors" in Your IDE](#9-how-to-fix-red-errors-in-your-ide)
10. [Troubleshooting & Verification Checklist](#10-troubleshooting--verification-checklist)

---

## 1. Prerequisites & Repository Structure

### Required Software
- **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/). Check "Add Python to PATH" during installation.
- **Node.js 18+ and npm**: Download from [nodejs.org](https://nodejs.org/).
- **Docker Desktop** *(Optional)*: Required only if running local Redis, RabbitMQ, or Nginx containers.

### Clean Project Tree
```text
HealthEase/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & 41 endpoints
│   │   ├── config.py            # Pydantic v2 Settings
│   │   ├── database.py          # Motor async client & unique indexes
│   │   ├── security.py          # bcrypt hashing & PyJWT tokens
│   │   ├── cache.py             # Redis caching layer with fallback
│   │   ├── rate_limiter.py      # Redis atomic rate limiter
│   │   ├── queue.py             # RabbitMQ event publisher
│   │   └── routes/              # Modular API routers
│   ├── worker.py                # Standalone RabbitMQ notification consumer
│   ├── requirements.txt         # Pinned backend dependencies
│   └── .env                     # Local environment settings
├── client/
│   ├── src/                     # Simplified React frontend (No Redux)
│   └── package.json             # Frontend dependencies & proxy to port 8000
├── scripts/
│   └── migrate_to_atlas.py      # Safe MongoDB-to-Atlas sync script
├── nginx/
│   └── nginx.conf               # Round-robin load balancer config
├── docker-compose.yml           # Full container orchestration
└── docs/
    └── SETUP_GUIDE.md           # This document
```

---

## 2. MongoDB Atlas Cloud Setup (Step-by-Step)

HealthEase stores all users, approved doctors, appointments, hospitals, and notifications persistently in MongoDB.

### Step 2.1: Create Your Atlas Cluster
1. Navigate to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign in or create a free account.
2. In the Atlas dashboard, click **Build a Database**.
3. Choose the **M0 Free (Shared)** tier.
4. Select a cloud provider (AWS, Google Cloud, or Azure) and choose the region geographically closest to you (e.g., `Mumbai (ap-south-1)`).
5. Name your cluster (e.g., `HealthEaseCluster`) and click **Create Deployment**.

### Step 2.2: Create a Database User
1. In the left sidebar, click **Security > Database Access**.
2. Click **Add New Database User**.
3. Select **Password** as the Authentication Method.
4. Set a Username (e.g., `healthease_admin`).
5. Click **Autogenerate Secure Password** or set a strong password. **Copy this password immediately.**
6. Under **Database User Privileges**, select **Read and write to any database** (or `Built-in Role: Atlas admin`).
7. Click **Add User**.

### Step 2.3: Configure Network IP Access
1. In the left sidebar, click **Security > Network Access**.
2. Click **Add IP Address**.
3. For local development from home/office, you can click **Add Current IP Address**.
4. For seamless access across different networks or cloud servers, click **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Confirm**. Wait 30 seconds for the status to turn green (**Active**).

### Step 2.4: Obtain Your Connection String
1. In the left sidebar, click **Database > Clusters**.
2. Click the **Connect** button on your cluster.
3. Select **Drivers** (Python).
4. Choose version **3.11 or later**.
5. Copy the connection string. It will look like:
   ```text
   mongodb+srv://healthease_admin:<password>@healtheasecluster.abcde.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
   ```
6. Replace `<password>` with your actual database user password.

### Step 2.5: Configure HealthEase Backend
Open `backend/.env` and update:
```env
MONGODB_URI=mongodb+srv://healthease_admin:YourActualPassword@healtheasecluster.abcde.mongodb.net/?retryWrites=true&w=majority&appName=HealthEase
MONGODB_DB=HealthEase
```

### Step 2.6: Migrate Existing Local Data to Atlas
If you have local MongoDB data that you want to transfer safely to Atlas:
```powershell
# 1. Run a Dry Run to verify documents without writing
python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://healthease_admin:YourActualPassword@healtheasecluster.abcde.mongodb.net" --dry-run

# 2. Run the actual migration
python scripts/migrate_to_atlas.py --source "mongodb://localhost:27017" --target "mongodb+srv://healthease_admin:YourActualPassword@healtheasecluster.abcde.mongodb.net"
```
The script will copy all `users`, `doctors`, `appointments`, and `hospitals` documents using idempotent upserts, preserving all MongoDB ObjectIds and rebuilding database indexes.

---

## 3. Cloud Redis Setup (Upstash / Redis Cloud)

Redis powers HealthEase's **directory caching** (sub-millisecond doctor and hospital retrieval) and **atomic rate limiting** (preventing brute-force attacks on login and chatbot).

### Option A: Free Serverless Redis on Upstash (Recommended)
1. Go to [upstash.com](https://upstash.com/) and sign up with GitHub or Google.
2. Click **Create Database**.
3. Set Name: `healthease-redis`.
4. Select Region: choose the region closest to your MongoDB Atlas cluster.
5. Choose **Primary** (Free Tier: 10,000 requests/day free).
6. Click **Create**.
7. In the database dashboard under **Connect your database**, select the **redis-py** tab.
8. Copy the `rediss://...` connection URL:
   ```text
   rediss://default:AbCdEf123456@your-endpoint.upstash.io:6379
   ```
9. Open `backend/.env` and update:
   ```env
   REDIS_URL=rediss://default:AbCdEf123456@your-endpoint.upstash.io:6379
   REDIS_ENABLED=true
   ```

### Option B: Local Redis via Docker
If you prefer running Redis locally on your machine:
```powershell
docker run -d --name healthease-redis -p 6379:6379 redis:7-alpine
```
Then keep `REDIS_URL=redis://localhost:6379/0` in `backend/.env`.

> **Resilience Guarantee**: If Redis is offline or unreachable, HealthEase will NOT crash. It will log a warning and automatically query MongoDB directly while applying in-memory rate limiting.

---

## 4. Cloud RabbitMQ Setup (CloudAMQP)

RabbitMQ handles **asynchronous event notifications**. When a patient books an appointment, FastAPI acknowledges the booking immediately and publishes a message to RabbitMQ. The `worker.py` background process consumes the message and writes in-app notifications.

### Option A: Free Cloud RabbitMQ on CloudAMQP (Recommended)
1. Go to [cloudamqp.com](https://www.cloudamqp.com/) and create a free account.
2. Click **Create New Instance**.
3. Name: `healthease-rabbitmq`.
4. Plan: Select **Little Lemur** (Free plan: 1M messages/month, 20 concurrent connections).
5. Select Data Center: Choose the region closest to you.
6. Click **Review > Create Instance**.
7. Click on your newly created instance name to open its details.
8. Copy the **AMQP URL**:
   ```text
   amqps://username:password@server.cloudamqp.com/vhost
   ```
9. Open `backend/.env` and update:
   ```env
   RABBITMQ_URL=amqps://username:password@server.cloudamqp.com/vhost
   ```

### Option B: Local RabbitMQ via Docker
```powershell
docker run -d --name healthease-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management-alpine
```
- AMQP port: `5672`
- Management Web UI: `http://localhost:15672` (Username: `guest`, Password: `guest`)

### Running the Notification Background Worker
Once `RABBITMQ_URL` is configured, start the background worker:
```powershell
cd c:\study\HealthEase\backend
.\venv\Scripts\Activate.ps1
python worker.py
```
> **Resilience Guarantee**: If RabbitMQ is offline, FastAPI automatically bypasses the message broker and writes notification records directly to MongoDB without delaying the patient's booking confirmation.

---

## 5. Google Gemini Medical AI Setup

HealthEase features a clinical medical assistant (**Dr. AI**) integrated with Google Gemini (`gemini-2.5-flash`), supporting voice microphone input, audio synthesis, and responsive text typing.

### Obtaining Your API Key
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** > **Create API key in new project**.
4. Copy the generated key (starts with `AIzaSy...`).
5. Open `backend/.env` and update:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```

---

## 6. Local Environment Configuration (.env)

Ensure your `backend/.env` has all values populated:

```env
# Application
PROJECT_NAME=HealthEase
API_V1_PREFIX=/api/v1
ENVIRONMENT=development
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

# Database (MongoDB Atlas or Local)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=HealthEase

# Security (Minimum 32 characters for SHA256)
JWT_SECRET=HARRYPOTTER123456_healthease_secure_jwt_secret_key_2026
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256

# Administrator Bootstrap
ADMIN_NAME=HealthEase Admin
ADMIN_EMAIL=admin@healthease.com
ADMIN_PASSWORD=Admin@HealthEase2026

# Redis (Cloud or Local)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=true
CACHE_TTL_SECONDS=300

# RabbitMQ (Cloud or Local)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
RABBITMQ_QUEUE=healthease_notifications

# Medical Chatbot
GEMINI_API_KEY=AIzaSyYourActualKeyHere
GEMINI_MODEL=gemini-2.5-flash
```

---

## 7. Starting the Application (PowerShell Instructions)

### Terminal 1: Start FastAPI Backend
```powershell
cd c:\study\HealthEase\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start Uvicorn ASGI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Terminal 2: Start React Frontend
```powershell
cd c:\study\HealthEase\client

# Install frontend dependencies (if not already done)
npm install

# Start development server
npm start
```
- Frontend will open at `http://localhost:3000`.

### Terminal 3 (Optional): Start RabbitMQ Notification Worker
```powershell
cd c:\study\HealthEase\backend
.\venv\Scripts\Activate.ps1
python worker.py
```

---

## 8. Docker Compose & Load Balancer (Nginx)

To demonstrate enterprise load balancing across two independent FastAPI instances:

```powershell
cd c:\study\HealthEase
docker compose up --build -d
```

### Services Started:
- `backend_1`: FastAPI instance #1 on port `8001`
- `backend_2`: FastAPI instance #2 on port `8002`
- `nginx_proxy`: Nginx reverse proxy on port `8080` (routes round-robin to backend 1 and 2)
- `redis`: Redis server on port `6379`
- `rabbitmq`: RabbitMQ broker on port `5672` (Web UI on `15672`)
- `worker`: Standalone notification worker container

To verify load balancing:
```powershell
# Check Nginx balancer status
curl http://localhost:8080/lb-health

# Send requests to balanced health endpoint
curl http://localhost:8080/health
```

To stop all containers:
```powershell
docker compose down
```

---

## 9. How to Fix "Red Errors" in Your IDE

If you see red squiggles or warnings in VS Code or Antigravity IDE:

### 1. Python "Module Not Found" or Red Imports
- **Cause**: VS Code is using the global Windows Python interpreter instead of your project's virtual environment.
- **Fix**:
  1. Press `Ctrl + Shift + P` in VS Code.
  2. Type and select: `Python: Select Interpreter`.
  3. Choose the interpreter located at:
     `c:\study\HealthEase\backend\venv\Scripts\python.exe`
  4. Red import squiggles on `fastapi`, `pydantic`, `motor`, etc. will vanish immediately.

### 2. PyJWT Insecure Key Warning
- **Cause**: HMAC SHA256 requires a key of at least 32 bytes (RFC 7518 Section 3.2).
- **Fix**: Ensure `JWT_SECRET` in `backend/.env` is at least 32 characters long. We updated it to `HARRYPOTTER123456_healthease_secure_jwt_secret_key_2026`.

### 3. React ESLint Unused Variable Warnings
- **Cause**: Unused imports (e.g. `moment` in pages that do not format dates).
- **Fix**: We eliminated all unused imports across `Appointments.js`, `BookingPage.js`, and `Chatbot.js`.

### 4. Port 8000 or Port 3000 Already in Use
- **Cause**: A previous process is still bound to the port.
- **Fix**: In PowerShell:
  ```powershell
  # Find process using port 8000
  Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess

  # Stop the process (replace PID with the OwningProcess number)
  Stop-Process -Id <PID> -Force
  ```

---

## 10. Troubleshooting & Verification Checklist

| Check | Expected Result | How to Test |
| :--- | :--- | :--- |
| **Backend Liveness** | HTTP 200 `{"status": "healthy"}` | Open `http://localhost:8000/health` |
| **Backend Readiness** | HTTP 200 `{"status": "ready"}` | Open `http://localhost:8000/ready` |
| **Swagger UI** | Interactive API testing page | Open `http://localhost:8000/docs` |
| **Patient Registration** | Register account as `patient` | Submit form at `/register` |
| **Double-Booking Guard** | Second booking on same slot returns HTTP 409 | Run `pytest tests/test_backend.py -v` |
| **Doctor Application** | Patient submits credentials -> Status `pending` | Submit form at `/apply-doctor` |
| **Admin Dashboard** | Review pending doctors & approve | Log in with admin credentials at `/admin/doctors` |
| **Dr. AI Chatbot** | Voice or text medical response | Ask a question at `/chatbot` |
| **Redis Cache** | Doctor directory response is cached | Request `/api/v1/user/getAllDoctors` |
| **Test Suite** | 10 passed out of 10 tests | Run `python -m pytest tests/test_backend.py -v` |
