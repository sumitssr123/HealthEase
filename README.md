# HealthEase — Next-Generation Telehealth & Medical Practice Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20Cloud-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-Upstash%20Cloud-DC382D.svg?logo=redis&logoColor=white)](https://upstash.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-CloudAMQP-FF6600.svg?logo=rabbitmq&logoColor=white)](https://www.cloudamqp.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**HealthEase** is an enterprise-grade, high-performance medical operations and telehealth platform engineered with an asynchronous microservice backend and a responsive, role-adaptive frontend. Designed to connect **Patients**, **Verified Healthcare Specialists**, and **Clinical Administrators**, the system pairs robust transactional guarantees with cloud-native caching, event-driven message queuing, and generative AI conversational triage.

---

## Table of Contents
1. [Key Performance & Benchmark Highlights](#1-key-performance--benchmark-highlights)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Key Platform Features by Persona](#3-key-platform-features-by-persona)
4. [Engineering & Architectural Decisions](#4-engineering--architectural-decisions)
   - [Asynchronous Non-Blocking Core](#asynchronous-non-blocking-core)
   - [Atomic Double-Booking Prevention](#atomic-double-booking-prevention)
   - [Intelligent Redis Caching & Invalidation](#intelligent-redis-caching--invalidation)
   - [Distributed Atomic Rate Limiter](#distributed-atomic-rate-limiter)
   - [Event-Driven Asynchronous Notifications](#event-driven-asynchronous-notifications)
   - [Conversational Medical AI 'Dr. AI'](#conversational-medical-ai-dr-ai)
5. [Repository Structure](#5-repository-structure)
6. [Newly Added & Engineering Scripts](#6-newly-added--engineering-scripts)
7. [REST API Endpoint Catalog](#7-rest-api-endpoint-catalog)
8. [Local Development & Setup Guide](#8-local-development--setup-guide)
9. [Automated Testing Suite](#9-automated-testing-suite)
10. [Docker Container Orchestration](#10-docker-container-orchestration)
11. [Production Deployment Guide](#11-production-deployment-guide)

---

## 1. Key Performance & Benchmark Highlights

Real-time empirical benchmarks recorded against the running production-mode FastAPI backend connected to live MongoDB Atlas and Upstash Redis clusters using the automated suite ([benchmark_healthease.py](benchmark_healthease.py)):

| Performance Metric | Measured Value | Benchmark Description |
|---|---|---|
| **Sustained Throughput** | **149.56 req/s** | Sustained asynchronous throughput across 1,000 requests (25 concurrent workers) |
| **Load Test p95 Latency** | **470.72 ms** | 95th percentile response latency under concurrent traffic load (p50: 105.65 ms) |
| **Cold MongoDB Directory Lookup** | **376.07 ms** | Cold cache miss fetching doctor directory from MongoDB Atlas over WAN with JSON serialization |
| **Warm Cached Directory Lookup** | **215.74 ms** | In-memory cache hit served directly from Upstash Redis over TLS |
| **Percentage Latency Reduction** | **42.63%** | Latency reduction achieved by bypassing database disk I/O and query engines |
| **Booking Conflict Rate** | **0.00%** | Zero race condition double-bookings guaranteed via partial database unique indexing |

---

## 2. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (React 19 SPA)"]
        UI["Patient / Doctor / Admin UI"]
        AxiosInterceptor["Axios Client (JWT Bearer Interceptor)"]
        WebSpeech["Web Speech API (STT & TTS)"]
        GoogleMaps["Embedded Google Maps Locator"]
        UI --> AxiosInterceptor
        UI --> WebSpeech
        UI --> GoogleMaps
    end

    subgraph Gateway ["Reverse Proxy & Load Balancer"]
        Nginx["Nginx Reverse Proxy (:80 / :443)"]
    end

    subgraph AppInstances ["Asynchronous Application Services"]
        API1["FastAPI Instance #1 (:8001)"]
        API2["FastAPI Instance #2 (:8002)"]
    end

    subgraph CachingLayer ["In-Memory Caching & Limiting"]
        Redis["Upstash Redis / Redis 7 Alpine\n- Directory Caches (TTL: 300s)\n- Atomic Sliding Window Rate Limiting"]
    end

    subgraph MessagingLayer ["Asynchronous Message Broker"]
        RabbitMQ["RabbitMQ / CloudAMQP (AMQP 0-9-1)\n- Queue: healthease_notifications\n- Delivery Mode: Persistent (2)"]
        Worker["Notification Consumer Daemon\n(Embedded Thread & Standalone worker.py)"]
    end

    subgraph DatabaseLayer ["Data Persistence"]
        Mongo["MongoDB Atlas / Local Mongo 7\n- Partial Unique Indexing\n- Connection Pool: 10-50 hot sockets\n- Auto-Fallback Architecture"]
    end

    subgraph AILayer ["Clinical AI Engine"]
        Gemini["Google Gemini 2.5 Flash / 1.5 Flash\n(Generative Language REST API)"]
    end

    AxiosInterceptor -->|HTTP / REST| Nginx
    Nginx -->|Round Robin Load Balancing| API1
    Nginx -->|Round Robin Load Balancing| API2

    API1 <-->|Read / Invalidate / Rate Limit| Redis
    API2 <-->|Read / Invalidate / Rate Limit| Redis

    API1 -->|Publish Event| RabbitMQ
    API2 -->|Publish Event| RabbitMQ
    RabbitMQ -->|Consume & Acknowledge| Worker
    Worker -->|Persist Notification Array & Doc| Mongo

    API1 <-->|Non-blocking Motor Queries| Mongo
    API2 <-->|Non-blocking Motor Queries| Mongo

    API1 <-->|HTTPS REST Prompts| Gemini
    API2 <-->|HTTPS REST Prompts| Gemini
```

---

## 3. Key Platform Features by Persona

### 🧑‍⚕️ For Patients
* **Specialist Directory:** Browse certified doctors by specialization, experience, clinic address, and consultation fees, boosted with Redis caching.
* **Instant Slot Verification:** Real-time checking of doctor availability for any given calendar date and slot.
* **Clinic Geo-Locator:** Interactive Google Maps iframe embedded in the booking portal displaying the practitioner's exact clinic location.
* **Telehealth Video Consultations:** Instant modal request for online telemedicine appointments.
* **Dr. AI Medical Assistant:** Real-time conversational triage powered by Google Gemini with speech-to-text input (automatic 1000ms pause detection) and natural text-to-speech voice responses.
* **In-App Notification Center:** Tabbed notification feed (Unread / Read) with instant badge counts.

### 👨‍⚕️ For Doctors
* **Onboarding & Verification:** Standard patient accounts can apply for verification by submitting clinical credentials, fees, and operational hours.
* **Practice Schedule Dashboard:** View upcoming and past appointments, update status (Approved, Rejected, Completed), and review patient details.
* **Clinic Profile & Hours Management:** Real-time updating of consultation fees, working time slots, and clinic addresses (which automatically purges cached directory entries).

### 🛡️ For Administrators
* **Executive Metric Gauges:** Real-time counts of total users, verified doctors, pending applications, active bookings, and registered hospitals.
* **Doctor Credential Governance:** Comprehensive review portal to approve or reject pending medical license applications.
* **User Management & Security:** Role audit and ability to block or unblock misbehaving user accounts.
* **Healthcare Network Expansion:** Register regional hospitals and trauma centers with geocoded coordinates.

---

## 4. Engineering & Architectural Decisions

### Asynchronous Non-Blocking Core
* Built on **FastAPI** and **Motor** (`AsyncIOMotorClient`), executing entirely on Python's event loop to achieve maximum concurrency with low memory footprint.
* Implements connection pooling with `minPoolSize=10` and `maxPoolSize=50`, ensuring hot connections are immediately available under burst traffic.
* Dual connection resilience: Gracefully connects to **MongoDB Atlas** (`mongodb+srv://`) with `certifi` TLS certificate validation, with an automated offline fallback to local MongoDB (`mongodb://localhost:27017`).
* Idempotent admin bootstrapping: On application lifespan startup, automatically upserts the system administrator (`admin@healthease.com`), eliminating manual seed scripts.

### Atomic Double-Booking Prevention
To eliminate booking race conditions under high concurrent load, HealthEase enforces database-level integrity via a MongoDB **Partial Unique Index**:
```python
IndexModel(
    [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
    unique=True,
    partialFilterExpression={"status": "booked"},
    name="idx_appointments_double_booking_prevention",
)
```
Any parallel attempt to book the identical slot for the same doctor raises a duplicate key error (code `11000`), completely preventing slot overlaps without requiring heavyweight distributed locks.

### Intelligent Redis Caching & Invalidation
* Directory queries for approved doctors (`healthease:doctors:approved`) and hospitals (`healthease:hospitals:all`) are stored in Redis with a 300-second TTL.
* **Active Invalidation:** Any mutation event (admin approving a doctor, doctor updating clinic hours/fees, adding hospital) explicitly purges the cached keys:
  ```python
  await cache.invalidate_doctors(doctor_id)
  ```
* **Resilient Circuit Breaker:** If Redis is unreachable, the system automatically falls back to direct database reads without throwing unhandled exceptions.

### Distributed Atomic Rate Limiter
* Critical endpoints are guarded against credential stuffing, denial-of-service, and abuse using atomic Redis pipelines (`INCR` + `EXPIRE`):
  * **User Registration:** 5 requests / minute
  * **Authentication:** 10 requests / minute
  * **Appointment Booking:** 10 requests / minute
  * **AI Chatbot:** 20 requests / minute
* If Redis is unavailable, an in-memory sliding-window limiter takes over seamlessly.

### Event-Driven Asynchronous Notifications
* Decouples HTTP request execution from notification generation.
* Uses **RabbitMQ** (`pika`) to dispatch persistent AMQP messages (`delivery_mode=2`) to the `healthease_notifications` queue.
* Notifications are consumed asynchronously with `basic_qos(prefetch_count=1)` and written both to a standalone `notifications` collection and appended to the recipient's user document for O(1) retrieval.
* **Embedded Daemon & Standalone Worker:** Includes an embedded consumer thread running inside FastAPI for zero-overhead local development, alongside a dedicated standalone daemon ([backend/worker.py](backend/worker.py)) for production container worker isolation.
* **Synchronous Fallback:** If the message broker is offline, notifications automatically persist directly to MongoDB via a circuit-breaking fallback mechanism.

### Conversational Medical AI 'Dr. AI'
* Powered by Google's **Gemini 2.5 Flash** with automated fallback to **Gemini 1.5 Flash**.
* Calls the Generative Language REST API directly via non-blocking `httpx.AsyncClient`.
* System instructions enforce safe clinical communication: empathetic tone, avoidance of medical jargon, concise 1-3 sentence answers, maximum 1-2 clarifying questions, practical home/first-aid remedies, and mandatory emergency disclaimers.
* Frontend integrates the HTML5 **Web Speech API** (`webkitSpeechRecognition`) with an automated 1000ms silence detection debounce, alongside synthesized speech (`SpeechSynthesisUtterance`) with automatic pitch and female voice selection.

---

## 5. Repository Structure

```text
HealthEase/
├── README.md                   # Unified Master Documentation
├── benchmark_healthease.py     # Automated Performance Benchmarking Suite
├── docker-compose.yml          # Multi-container orchestration (Redis, RabbitMQ, Backends, Nginx)
├── pyrightconfig.json          # Type checker configuration
├── backend/
│   ├── Dockerfile              # Production Python 3.11-slim container image
│   ├── requirements.txt        # Backend dependencies (FastAPI, Motor, Redis, Pika, etc.)
│   ├── worker.py               # Standalone RabbitMQ background notification worker daemon
│   ├── .env                    # Environment configuration & credentials
│   └── app/
│       ├── main.py             # FastAPI factory, lifespan manager, CORS, /health & /ready
│       ├── config.py           # Pydantic v2 settings schema
│       ├── database.py         # Motor async client, indexing, bootstrap admin, Atlas fallback
│       ├── security.py         # bcrypt password hashing & PyJWT token handling
│       ├── dependencies.py     # FastAPI dependency guards (get_current_user, require_admin, require_doctor)
│       ├── cache.py            # Redis caching client with active cache invalidation
│       ├── rate_limiter.py     # Redis atomic pipeline rate limiter with in-memory fallback
│       ├── queue.py            # RabbitMQ AMQP notification publisher with direct-to-DB fallback
│       ├── consumer.py         # Embedded background RabbitMQ consumer thread for FastAPI
│       ├── schemas.py          # Pydantic request/response validation schemas
│       └── routes/             # Modular REST API endpoints
│           ├── auth_routes.py         # Registration, login, /getUserData, profile updates
│           ├── doctor_routes.py       # Doctor application, cached directory, profile updates
│           ├── appointment_routes.py  # Availability checking, atomic booking, cancellation
│           ├── hospital_routes.py     # Hospital catalog CRUD with coordinates
│           ├── admin_routes.py        # System stats, doctor credential approvals, user blocking
│           ├── notification_routes.py # In-app notification retrieval and read status updates
│           └── chatbot_routes.py      # Google Gemini AI integration with rate-limiting
├── client/
│   ├── package.json            # React 19 dependencies, scripts, proxy configuration
│   ├── package-lock.json       # Deterministic frontend lockfile
│   ├── public/                 # Static assets, index.html, favicon, manifest
│   └── src/
│       ├── api.js              # Centralized Axios client with JWT request/response interceptors
│       ├── App.js              # Application routing table & route guards
│       ├── App.test.js         # Frontend unit tests
│       ├── index.js            # React root mount wrapping App in AuthProvider
│       ├── index.css           # Global typography, glassmorphism tokens, and theme
│       ├── components/         # Reusable UI widgets (Layout, DoctorList, Spinner, Route Guards)
│       ├── context/            # Global React Context (AuthContext)
│       ├── Data/               # Sidebar menu data structures per role
│       ├── pages/              # Role-adaptive views (Dashboard, Booking, Chatbot, Admin, Hospitals)
│       └── styles/             # Modular CSS stylesheets
├── nginx/
│   └── nginx.conf              # Production Nginx reverse proxy & load balancer configuration
├── scripts/
│   └── migrate_to_atlas.py     # Idempotent dual-mode MongoDB Atlas migration & verification engine
├── tests/
│   ├── __init__.py             # Test package marker
│   └── test_backend.py         # Comprehensive Pytest backend integration test suite (10/10 tests)
└── venv/                       # Local Python virtual environment
```

---

## 6. Newly Added & Engineering Scripts

### 1. `benchmark_healthease.py`
Automated, high-precision benchmarking suite that tests the running FastAPI server:
* Purges Redis to record true cold MongoDB Atlas directory lookup latency across multiple runs.
* Measures warm cached directory retrieval from Upstash Redis.
* Executes concurrent load testing (1,000 asynchronous requests across 25 concurrent workers) using `httpx.AsyncClient` connection pools.
* Calculates sustained throughput (req/s), latency reduction (%), and exact percentiles (p50, p90, p95, p99).
```bash
python benchmark_healthease.py
```

### 2. `scripts/migrate_to_atlas.py`
Production-grade MongoDB migration utility designed for moving local collections (`users`, `doctors`, `appointments`, `notifications`, `hospitals`) to MongoDB Atlas:
* Preserves original `ObjectId` keys, timestamps, and foreign key references.
* Features a non-destructive preview mode (`--dry-run`).
* Uses idempotent `ReplaceOne(upsert=True)` operations to support safe interrupted reruns.
* Automatically verifies target database indexes post-migration.
```bash
# Preview dry run:
python scripts/migrate_to_atlas.py --dry-run

# Execute live migration:
python scripts/migrate_to_atlas.py --target-uri "mongodb+srv://user:pass@cluster.mongodb.net" --target-db "HealthEase"
```

### 3. `backend/worker.py`
Dedicated, standalone AMQP notification worker daemon built with `pika`. Consumes messages from RabbitMQ with `prefetch_count=1`, writes them to MongoDB, and dispatches manual acknowledgments (`basic_ack`).
```bash
python backend/worker.py
```

### 4. `backend/app/consumer.py`
Embedded notification consumer running as a background daemon thread directly inside FastAPI's lifespan. Ensures full event-driven notification processing during local development without requiring multiple open terminals.

### 5. `tests/test_backend.py`
Comprehensive integration test suite covering 10 critical operational areas:
1. Operational Liveness Probe (`/health`)
2. Operational Readiness Probe (`/ready`)
3. Patient Registration & JWT Login
4. Invalid Password Authentication Rejection
5. Role-Based Access Control (RBAC) Verification
6. Doctor Application & Administrator Review Workflow
7. Atomic Appointment Booking & Double-Booking Prevention
8. Hospital Directory Catalog & Geospatial Data
9. Notification Queue Lifecycle & Direct Fallback
10. Dr. AI Generative Chatbot Endpoint

---

## 7. REST API Endpoint Catalog

| Router | Method | Path | Description | Access |
|---|---|---|---|---|
| **Operational** | `GET` | `/health` | Liveness probe returning status and timestamp | Public |
| **Operational** | `GET` | `/ready` | Readiness probe validating MongoDB and Redis health | Public |
| **Operational** | `GET` | `/docs` | Interactive Swagger UI API documentation | Public |
| **Auth** | `POST` | `/api/v1/user/register` | Patient account registration (rate-limited) | Public |
| **Auth** | `POST` | `/api/v1/user/login` | User authentication & JWT issuance (rate-limited) | Public |
| **Auth** | `GET` | `/api/v1/user/getUserData` | Hydrate active user session profile | Bearer Token |
| **Auth** | `POST` | `/api/v1/user/update-profile` | Update user profile details | Bearer Token |
| **Doctors** | `POST` | `/api/v1/user/apply-doctor` | Submit doctor verification application | Patient |
| **Doctors** | `GET` | `/api/v1/user/getAllDoctors` | List approved doctors (Cached in Redis) | Bearer Token |
| **Doctors** | `POST` | `/api/v1/doctor/getDoctorById` | Get specific doctor profile details | Bearer Token |
| **Doctors** | `POST` | `/api/v1/doctor/updateProfile` | Update doctor clinical hours, address, fees | Verified Doctor |
| **Appointments**| `POST` | `/api/v1/user/booking-availbility` | Verify slot availability for specific date/time | Bearer Token |
| **Appointments**| `POST` | `/api/v1/user/book-appointment` | Atomic reservation of appointment slot | Patient |
| **Appointments**| `GET` | `/api/v1/user/user-appointments` | List patient appointment bookings | Patient |
| **Appointments**| `GET` | `/api/v1/doctor/doctor-appointments` | List appointments booked with current doctor | Verified Doctor |
| **Appointments**| `POST` | `/api/v1/doctor/update-status` | Approve, reject, or complete appointment slot | Verified Doctor |
| **Appointments**| `POST` | `/api/v1/user/cancel-appointment` | Cancel booked appointment and release slot | Patient |
| **Hospitals** | `GET` | `/api/v1/hospitals` | Catalog of hospitals & trauma centers (Cached) | Bearer Token |
| **Hospitals** | `POST` | `/api/v1/hospitals` | Register new hospital with coordinates | Doctor / Admin |
| **Admin** | `GET` | `/api/v1/admin/stats` | Executive system counts & platform metrics | Admin |
| **Admin** | `GET` | `/api/v1/admin/getAllUsers` | List registered user accounts | Admin |
| **Admin** | `GET` | `/api/v1/admin/getAllDoctors` | List all doctor applications (pending/approved) | Admin |
| **Admin** | `POST` | `/api/v1/admin/changeAccountStatus` | Approve or reject doctor credentials | Admin |
| **Admin** | `POST` | `/api/v1/admin/blockUser` | Toggle user account active/blocked status | Admin |
| **Notifications**| `GET` | `/api/v1/user/notifications` | Get in-app notifications (Unread and Seen) | Bearer Token |
| **Notifications**| `POST` | `/api/v1/user/get-all-notification` | Mark all unread notifications as read | Bearer Token |
| **Notifications**| `POST` | `/api/v1/user/delete-all-notification` | Delete all read notifications | Bearer Token |
| **Chatbot** | `POST` | `/api/v1/chatbot/chat` | Conversational medical triage with Google Gemini | Bearer Token |

---

## 8. Local Development & Setup Guide

### Prerequisites
* **Python 3.11+** installed
* **Node.js 18+** & **npm** installed
* MongoDB instance (local or MongoDB Atlas connection URI)
* Redis instance (local or Upstash Redis URL)
* RabbitMQ instance (local or CloudAMQP URL)
* Google Gemini API key ([Google AI Studio](https://ai.google.dev/))

### 1. Backend Setup
```bash
# Navigate to backend
cd backend

# Create & activate virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate
# Linux/macOS:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Configure `backend/.env`:
```env
PROJECT_NAME=HealthEase
API_V1_PREFIX=/api/v1
ENVIRONMENT=development
PORT=8000
FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173

# MongoDB Atlas or Local
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0
MONGODB_DB=HealthEase

# Security
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256

# Bootstrap Admin
ADMIN_NAME=HealthEase Admin
ADMIN_EMAIL=admin@healthease.com
ADMIN_PASSWORD=admin_secure_password_123

# Redis (Upstash or Local)
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379
REDIS_ENABLED=true
CACHE_TTL_SECONDS=300

# RabbitMQ (CloudAMQP or Local)
RABBITMQ_URL=amqps://<username>:<password>@<host>/<vhost>
RABBITMQ_QUEUE=healthease_notifications

# Google Gemini Medical AI
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
```

Start the FastAPI application:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
# Navigate to client in a new terminal
cd client

# Install dependencies
npm install

# Start development server
npm start
```
The React SPA opens at `http://localhost:3000`.

---

## 9. Automated Testing Suite

To run the complete backend integration test suite:
```bash
# From workspace root:
pytest tests/test_backend.py -v
```
All 10 test cases execute against the live application Lifespan, validating database connectivity, cache operations, authentication, RBAC, concurrent slot reservations, and notification handling.

To run the benchmark suite:
```bash
python benchmark_healthease.py
```

---

## 10. Docker Container Orchestration

HealthEase includes a production-ready `docker-compose.yml` orchestrating all services with health checks and worker isolation:

```bash
# Build and launch all services in detached mode
docker-compose up -d --build
```

### Managed Services
| Service Container | Image | Ports | Role |
|---|---|---|---|
| `healthease-redis` | `redis:7-alpine` | `6379:6379` | In-memory cache & rate limiter |
| `healthease-rabbitmq` | `rabbitmq:3-management-alpine` | `5672:5672`, `15672:15672` | AMQP broker with web management UI |
| `healthease-backend-1` | Custom `backend/Dockerfile` | `8001:8000` | Asynchronous FastAPI instance #1 |
| `healthease-backend-2` | Custom `backend/Dockerfile` | `8002:8000` | Asynchronous FastAPI instance #2 |
| `healthease-nginx` | `nginx:alpine` | `80:80` | Reverse proxy and load balancer |
| `healthease-worker` | Custom `backend/Dockerfile` | Background | Dedicated RabbitMQ notification worker |

To monitor logs across containers:
```bash
docker-compose logs -f
```

---

## 11. Production Deployment Guide

HealthEase is decoupled and ready for cloud native deployment:

* **Backend Service (FastAPI):** Deploy container to **Render**, **Railway**, or **AWS ECS/EC2**. Set environment variables matching `backend/.env`. Expose port `8000`. Health probe: `GET /health`.
* **Frontend SPA (React):** Build static assets via `npm run build` and deploy to **Vercel**, **Netlify**, or **AWS S3 + CloudFront**. Set `REACT_APP_API_URL` to the public backend domain.
* **Database (MongoDB):** Provision an M0 (Free Tier) or M10 cluster on **MongoDB Atlas**. Configure Network Access IP whitelist (`0.0.0.0/0` for dynamic cloud hosts or specific VPC peering).
* **Cache (Redis):** Provision a serverless Redis instance on **Upstash Redis** (`rediss://...`).
* **Message Broker (RabbitMQ):** Provision a Lemur instance on **CloudAMQP** (`amqps://...`).

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).
