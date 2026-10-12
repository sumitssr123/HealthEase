# HealthEase — Comprehensive Technical Architecture & System Reference

HealthEase is an enterprise-grade, asynchronous hospital and clinical management system built on a modern microservices-ready architecture. It integrates a **FastAPI** backend with a **React** single-page application, backed by **MongoDB**, **Redis**, **RabbitMQ**, and an **Nginx** reverse proxy load balancer, augmented by an AI-assisted medical triage assistant powered by **Google Gemini**.

---

## 1. Project Overview

### Purpose & Problem Statement
Modern healthcare scheduling platforms frequently suffer from several critical technical and operational failures:
1. **Slot Collisions & Double-Booking:** Concurrent users attempting to reserve identical appointment slots often encounter race conditions that lead to double-booked doctors.
2. **Synchronous I/O Bottlenecks:** Blocking operations during appointment reservation (such as writing database records, recalculating calendar states, and delivering multi-party notifications) drastically inflate request latency.
3. **Database Read Exhaustion:** High-frequency directory browsing of doctors and medical centers repeatedly queries primary databases for semi-static records.
4. **Unregulated API Traffic:** Critical endpoints (such as credential authentication and third-party AI interfaces) are vulnerable to credential stuffing, denial-of-service, and budget depletion without granular rate control.
5. **Medical Triage Ambiguity:** Patients seeking preliminary clinical information lack immediate guidance before their physical visits.

HealthEase resolves these challenges by combining database-enforced concurrency guards, asynchronous event-driven message queuing, in-memory caching with active invalidation, distributed atomic rate limiting, and conversational AI triage into a unified, modular platform.

### Target Audiences & Roles
- **Patients:** Register, browse verified medical practitioners, check live slot availability, immediately secure non-colliding clinic visits or video consultations, explore regional hospitals on an interactive map, communicate with an AI medical triage assistant, and receive in-app notifications.
- **Doctors:** Submit clinical credentials for verification, configure weekly consultation timings and fees, review booked appointments, adjust statuses, and manage public professional profiles.
- **System Administrators:** Oversee system metrics, review pending doctor credential applications, approve or reject provider accounts, monitor user accounts, and enforce platform governance.

---

## 2. Complete Technology Stack

Every technology, library, service, and infrastructure tool listed below is actively implemented and utilized within the HealthEase codebase.

### Technology Inventory

| Category | Technology / Library | Version | Codebase Location | Concrete Project Purpose |
|---|---|---|---|---|
| **Backend Framework** | **FastAPI** | `>=0.110.0` | `backend/app/main.py`, `backend/app/routes/` | High-performance asynchronous REST API framework providing dependency injection, OpenAPI documentation, and request routing. |
| **ASGI Server** | **Uvicorn** | `>=0.28.0` | `backend/Dockerfile`, local CLI | Asynchronous Server Gateway Interface running the ASGI application on top of Python's event loop. |
| **Data Validation** | **Pydantic v2** | `>=2.6.0` | `backend/app/schemas.py` | Strict data parsing, request/response schema modeling, and type validation for all inbound JSON payloads. |
| **Configuration** | **Pydantic-Settings** | `>=2.2.0` | `backend/app/config.py` | Type-safe environment variable parsing from `.env` with fallback defaults. |
| **Primary Database** | **MongoDB** | `7.0+` (Atlas / Local) | `backend/app/database.py`, `scripts/migrate_to_atlas.py` | Document database storing users, doctors, appointments, hospitals, and notification records. |
| **Async Mongo Driver** | **Motor** | `>=3.4.0` | `backend/app/database.py` | Non-blocking MongoDB client enabling asynchronous coroutines during all API query executions. |
| **Sync Mongo Driver** | **PyMongo** | `>=4.6.0` | `backend/worker.py`, `scripts/migrate_to_atlas.py` | Synchronous client used in the standalone notification worker and batch migration utility. |
| **Caching Layer** | **Redis** | `7-alpine` / Upstash | `backend/app/cache.py` | In-memory key-value store caching approved doctor directories and hospital listings with 300s TTL. |
| **Redis Client** | **redis-py (asyncio)** | `>=5.0.0` | `backend/app/cache.py`, `backend/app/rate_limiter.py` | Asynchronous Redis client managing connection pools, pipeline execution, and cache eviction. |
| **Message Broker** | **RabbitMQ** | `3-management-alpine` / CloudAMQP | `backend/app/queue.py`, `backend/worker.py` | AMQP message broker decoupling notification publishing from the synchronous HTTP request cycle. |
| **AMQP Client** | **pika** | `>=1.3.2` | `backend/app/queue.py`, `backend/worker.py` | Python AMQP client for publishing persistent messages and driving the background worker consumer loop. |
| **Authentication** | **PyJWT** | `>=2.8.0` | `backend/app/security.py`, `backend/app/dependencies.py` | Encodes and verifies HMAC-SHA256 signed JSON Web Tokens for stateless identity authentication. |
| **Password Hashing** | **bcrypt** | `>=4.1.0` | `backend/app/security.py` | Cryptographic hashing of user credentials using adaptive salt rounds (work factor 12). |
| **HTTP Client** | **httpx** | `>=0.27.0` | `backend/app/routes/chatbot_routes.py` | Asynchronous non-blocking HTTP client executing outbound REST calls to the Google Gemini API. |
| **AI Integration** | **Google Gemini** | `gemini-2.5-flash` | `backend/app/routes/chatbot_routes.py` | Generative medical conversational model executing clinical triage with strict system prompts. |
| **Reverse Proxy / LB** | **Nginx** | `alpine` | `nginx/nginx.conf` | Layer 7 reverse proxy performing round-robin load distribution across backend instances. |
| **Containerization** | **Docker & Docker Compose** | Engine v24+, Compose v2+ | `docker-compose.yml`, `backend/Dockerfile` | Multi-container orchestration managing application isolation, health monitoring, and networking. |
| **Frontend Framework** | **React** | `^19.2.4` | `client/src/` | Component-based single-page user interface with reactive state synchronization. |
| **Client Routing** | **React Router DOM** | `^7.13.0` | `client/src/App.js` | Client-side routing enforcing declarative public, protected, and role-based route guards. |
| **UI Design System** | **Ant Design (antd)** | `^6.2.2` | `client/src/pages/`, `client/src/components/` | Enterprise UI component library providing forms, data tables, modals, badges, and notification tabs. |
| **HTTP Interceptor** | **Axios** | `^1.13.4` | `client/src/api.js` | Configured HTTP client automatically injecting JWT Bearer tokens and catching 401 unauthenticated errors. |
| **Temporal Parsing** | **Moment.js** | `^2.30.1` | `client/src/components/DoctorList.js`, `client/src/pages/` | Robust parsing and display formatting for appointment dates, clinical slots, and operating hours. |
| **Iconography** | **FontAwesome & React Icons** | `6.4.2` / `^5.5.0` | `client/public/index.html`, `client/src/Data/data.js` | Consistent visual iconography across navigation menus, status pills, and action triggers. |
| **Backend Testing** | **pytest & pytest-asyncio** | `>=8.0.0` / `>=0.23.0` | `tests/test_backend.py` | Automated integration test suite validating probes, RBAC, slot booking, concurrency, and caching. |
| **Frontend Testing** | **Jest & React Testing Library**| `^16.3.2` | `client/src/App.test.js` | Unit testing verifying DOM rendering and component integrity. |

---

### Docker & Containerization Architecture

HealthEase utilizes **Docker Compose** (`docker-compose.yml`) to orchestrate six services in an isolated virtual bridge network:

```text
[ External Clients / Web Browsers ]
                 │
                 ▼ Port 8080
      ┌──────────────────────┐
      │     nginx_proxy      │  (Nginx Alpine: Round-Robin Layer 7 Load Balancer)
      └──────────┬───────────┘
                 ├─── (Round Robin Routing) ───┐
                 ▼ Port 8000                   ▼ Port 8000
        ┌─────────────────┐           ┌─────────────────┐
        │   backend_1     │           │   backend_2     │  (FastAPI Instances)
        └────────┬────────┘           └────────┬────────┘
                 │                             │
    ┌────────────┴─────────────────────────────┴────────────┐
    ▼                                  ▼                    ▼
┌──────────────┐             ┌──────────────────┐    ┌────────────────────┐
│    redis     │             │     rabbitmq     │    │   MongoDB Atlas    │
│  Port 6379   │             │ Ports 5672/15672 │    │  (or Local Port    │
│ (Cache/Rate) │             │ (Message Broker) │    │      27017)        │
└──────────────┘             └─────────┬────────┘    └────────────────────┘
                                       │
                                       ▼ (Consumes Events)
                             ┌──────────────────┐
                             │      worker      │  (RabbitMQ Consumer Daemon)
                             └──────────────────┘
```

#### Detailed Service Roles & Networking:
1. **`nginx_proxy` (Port 8080):** Public entry point. Terminates client HTTP requests and load-balances them across `backend_1` and `backend_2`. Provides a dedicated health probe at `/lb-health`.
2. **`backend_1` & `backend_2` (Internal Ports 8000, Host Mappings 8001 & 8002):** Identical stateless FastAPI application instances. Each maintains an independent connection pool to MongoDB and Redis, and an outbound publisher to RabbitMQ.
3. **`redis` (Port 6379):** Containerized Redis 7 Alpine instance with append-only persistence (`--appendonly yes`) and healthcheck monitoring (`redis-cli ping`). Holds directory caches and fixed-window rate counters.
4. **`rabbitmq` (AMQP Port 5672, Management UI Port 15672):** Durable message broker configured with default healthcheck probes (`rabbitmq-diagnostics ping`). Declares the queue `healthease_notifications`.
5. **`worker`:** Standalone background worker process built from the backend Docker context (`python worker.py`). Consumes messages from RabbitMQ and persists notification documents to MongoDB.
6. **Container Problem Solved:** Eliminates local environment drift, guarantees identical Python 3.11 runtimes across replicas, isolates the message broker and cache from host OS quirks, and demonstrates horizontal scalability with zero manual network wiring.

---

## 3. Project Architecture & Request Flows

### Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client Layer (React SPA)"]
        UI["React 19 SPA (Ant Design)"]
        AUTH_CTX["AuthContext & LocalStorage (JWT)"]
        AXIOS["Axios Interceptor (/api/v1)"]
    end

    subgraph GatewayLayer["Gateway & Load Balancing"]
        NGINX["Nginx Reverse Proxy (:8080)"]
    end

    subgraph ServiceLayer["Application Service Layer"]
        API1["FastAPI Instance 1 (:8001)"]
        API2["FastAPI Instance 2 (:8002)"]
        RATE["Rate Limiter (Atomic INCR)"]
        RBAC["RBAC & Security Guard (JWT)"]
    end

    subgraph CacheAndQueue["In-Memory & Messaging Layer"]
        REDIS[("Redis Cache & Rate Limiting")]
        RABBIT[("RabbitMQ: healthease_notifications")]
    end

    subgraph StorageLayer["Data & Persistence Layer"]
        MONGO[("MongoDB (Atlas / Local :27017)")]
        INDEXES["Unique Partial Index: idx_appointments_double_booking"]
    end

    subgraph BackgroundWorker["Asynchronous Worker Layer"]
        WORKER["Worker Daemon (worker.py)"]
    end

    subgraph ExternalServices["External Cloud Integrations"]
        GEMINI["Google Gemini API (gemini-2.5-flash)"]
        GMAPS["Google Maps Embed API"]
    end

    %% Client flows
    UI --> AUTH_CTX
    AUTH_CTX --> AXIOS
    AXIOS -->|HTTP Requests| NGINX

    %% Gateway to services
    NGINX -->|Round Robin| API1
    NGINX -->|Round Robin| API2

    %% Services internal operations
    API1 & API2 --> RATE
    API1 & API2 --> RBAC
    RATE -.->|Check Window| REDIS
    API1 & API2 -->|Read/Invalidate Cache| REDIS

    %% Database operations
    API1 & API2 -->|Motor Async I/O| MONGO
    MONGO --- INDEXES

    %% Messaging operations
    API1 & API2 -->|Publish Notification Event| RABBIT
    RABBIT -->|Consume Event (AMQP Ack)| WORKER
    WORKER -->|Persist In-App Notification| MONGO

    %% Fallback direct persistence
    API1 & API2 -.->|Fallback if RabbitMQ Offline| MONGO

    %% External API calls
    API1 & API2 -->|Async HTTP (httpx)| GEMINI
    UI -->|Iframe Render| GMAPS
```

---

### Annotated Directory Tree

```text
HealthEase/
├── .gitignore                      # Git exclusion rules (venv, node_modules, logs, secrets)
├── docker-compose.yml              # Multi-container orchestration (Nginx, 2x FastAPI, Redis, RabbitMQ, Worker)
├── pyrightconfig.json              # Python static type analysis configuration (extraPaths, venv mapping)
├── README.md                       # Comprehensive architecture reference manual (this document)
│
├── backend/                        # Backend Application Root
│   ├── Dockerfile                  # Python 3.11-slim container specification
│   ├── requirements.txt            # Explicit backend dependencies
│   ├── worker.py                   # Standalone AMQP notification consumer daemon
│   └── app/                        # Modular FastAPI Application Package
│       ├── __init__.py             # Package marker
│       ├── config.py               # Pydantic v2 Settings class & environment configuration
│       ├── database.py             # Motor async database client, indexes, admin bootstrap & fallback
│       ├── security.py             # bcrypt password hashing & PyJWT token encode/decode
│       ├── dependencies.py         # FastAPI dependency injection: get_current_user, require_admin, require_doctor
│       ├── cache.py                # Redis caching client with active invalidation routines
│       ├── rate_limiter.py         # Redis-backed atomic rate limiter with in-memory fallback
│       ├── queue.py                # RabbitMQ AMQP notification publisher with direct-to-DB fallback
│       ├── schemas.py              # Pydantic request/response payload schemas
│       ├── main.py                 # FastAPI application factory, lifespan context, CORS, /health & /ready
│       └── routes/                 # Decoupled API Route Modules
│           ├── __init__.py         # Package marker
│           ├── auth_routes.py      # Registration, login, /getUserData, and profile updates
│           ├── doctor_routes.py    # Doctor application, directory listing, profile updates, and schedules
│           ├── appointment_routes.py # Availability checks, atomic booking, cancellation, and status updates
│           ├── hospital_routes.py  # Hospital catalog CRUD with coordinate mapping
│           ├── admin_routes.py     # System statistics, doctor approval/rejection, user account management
│           ├── notification_routes.py # Marking notifications read, deleting read alerts
│           └── chatbot_routes.py   # Google Gemini conversational AI integration with rate-limiting
│
├── client/                         # Frontend Single-Page Application Root
│   ├── package.json                # React dependencies, proxy configuration, and build scripts
│   ├── package-lock.json           # Deterministic dependency lockfile
│   ├── public/                     # Public static web assets
│   │   ├── favicon.ico             # Browser icon
│   │   ├── index.html              # HTML5 entry document loading Bootstrap & FontAwesome CDN
│   │   ├── manifest.json           # Web app manifest metadata
│   │   └── robots.txt              # Search engine crawler policies
│   └── src/                        # React Application Source
│       ├── api.js                  # Centralized Axios instance with JWT Authorization interceptor
│       ├── App.js                  # Route mapping for public, protected, and role-guarded views
│       ├── App.test.js             # Automated unit tests for core UI components
│       ├── index.js                # React DOM mount point wrapping App in AuthProvider
│       ├── index.css               # Global glassmorphism theme, typography, and styling tokens
│       ├── components/             # Reusable Interface Components
│       │   ├── DoctorList.js       # Doctor profile card with formatted timings and direct booking trigger
│       │   ├── Layout.js           # Shared dashboard shell with responsive sidebar, notifications, and topbar
│       │   ├── ProtectedRoute.js   # Route wrapper redirecting unauthenticated sessions to /login
│       │   ├── PublicRoute.js      # Route wrapper redirecting authenticated sessions to /dashboard
│       │   └── Spinner.js          # Loading state visual indicator
│       ├── context/                # React State Contexts
│       │   └── AuthContext.js      # Authentication context managing session persistence and token lifecycle
│       ├── Data/                   # Static Configuration Data
│       │   └── data.js             # Sidebar navigation definitions for user, doctor, and admin roles
│       ├── pages/                  # Top-Level Page Components
│       │   ├── LandingPage.js      # Public landing portal with portal-specific login options
│       │   ├── Login.js            # User authentication view
│       │   ├── Register.js         # Patient account registration view
│       │   ├── HomePage.js         # Role-adaptive dashboard (Admin stats, Doctor agenda, Patient directory)
│       │   ├── ApplyDoctor.js      # Doctor verification application submission form
│       │   ├── BookingPage.js      # Calendar slot selection, availability validation, and Google Maps view
│       │   ├── Appointments.js     # Patient appointment management table with slot cancellation
│       │   ├── HospitalPage.js     # Regional hospital catalog with service tags and location modals
│       │   ├── NotificationPage.js # Tabbed notification center (unread and read management)
│       │   ├── UserProfile.js      # Patient profile modification form
│       │   ├── Chatbot.js          # Dr. AI interface with speech recognition and speech synthesis
│       │   ├── admin/              # Administrator-Only Views
│       │   │   ├── Doctors.js      # Doctor application review with approve/reject triggers
│       │   │   └── Users.js        # User account management table
│       │   └── doctor/             # Doctor-Only Views
│       │       ├── DoctorAppointments.js # Doctor agenda table with appointment approval/rejection controls
│       │       └── Profile.js      # Doctor professional details and schedule management
│       └── styles/                 # Modular Component Styles
│           ├── LayoutStyles.css    # Sidebar, header, and dashboard content styles
│           └── RegisterStyles.css  # Authentication container and form layout styles
│
├── nginx/                          # Reverse Proxy Configuration
│   └── nginx.conf                  # Upstream definition, timeouts, headers, and /lb-health probe
│
├── scripts/                        # Maintenance & Operational Automation
│   └── migrate_to_atlas.py         # MongoDB migration script (dry-run mode, bulk upserts, index creation)
│
└── tests/                          # Automated Integration Test Suite
    ├── __init__.py                 # Package marker
    └── test_backend.py             # 10 integration tests validating all backend subsystems
```

---

### Major Request and Data Flows

#### 1. User Authentication & JWT Session Flow
1. **Client Submission:** The user submits email and password at `/login`.
2. **Rate Limit Validation:** `rate_limiter.py` checks client IP against Redis (`max_requests=10, window=60s`).
3. **Password Verification:** `auth_routes.py` queries MongoDB for the user record and calls `security.verify_password()` using bcrypt.
4. **Token Generation:** `security.create_access_token()` generates an HMAC-SHA256 JWT containing `sub`, `email`, `isAdmin`, `isDoctor`, and `exp` claims.
5. **Session Hydration:** The client stores the token in `localStorage`. Subsequent requests pass through `api.js`, which injects `Authorization: Bearer <token>`.
6. **Dependency Extraction:** `dependencies.get_current_user()` verifies the JWT signature, queries MongoDB for the active account, strips the password hash, and injects user context into route handlers.

#### 2. Doctor Application & Administrator Review Flow
1. **Application:** An authenticated patient submits clinical qualifications at `/api/v1/user/apply-doctor`.
2. **Initial State:** `doctor_routes.py` creates a record in `doctors` with `status: "pending"`.
3. **Notification Event:** `queue.publish_notification_event()` publishes an `apply-doctor-request` message to RabbitMQ.
4. **Worker Persistence:** `worker.py` consumes the message and adds an unread alert to the administrator's notifications.
5. **Admin Action:** The admin visits `/api/v1/admin/changeAccountStatus` to approve or reject the applicant.
6. **Elevation & Cache Eviction:** On approval, `admin_routes.py` updates the doctor record (`status: "approved"`), elevates the user (`isDoctor: True, role: "doctor"`), and triggers `cache.invalidate_doctors()`.

#### 3. Appointment Booking & Double-Booking Prevention Flow
1. **Availability Check:** The client checks a slot at `/api/v1/user/booking-availbility`.
2. **Pre-Check Query:** `appointment_routes.py` inspects the `appointments` collection for an existing document matching `{ doctorId, date, time, status: "booked" }`.
3. **Atomic Booking:** If clear, the patient invokes `/api/v1/user/book-appointment`.
4. **Database Guard Execution:** An appointment document with `status: "booked"` is inserted into MongoDB. If a concurrent request attempts to reserve the identical `{ doctorId, date, time }`, MongoDB's partial unique index (`idx_appointments_double_booking_prevention`) throws a `DuplicateKeyError`.
5. **Conflict Translation:** The endpoint catches the error and returns HTTP 409 (or `{ success: False, message: "Slot Conflict..." }`), preventing data corruption.
6. **Event Dispatch:** On success, a notification is dispatched via RabbitMQ to the doctor's agenda.
7. **Slot Release:** If the appointment is cancelled via `/api/v1/user/cancel-appointment`, the status updates to `"cancelled"`, automatically releasing the partial unique index constraint.

---

## 4. Feature-by-Feature Technical Explanation

### 1. Authentication & User Management
- **Purpose:** Secure identity registration, credential validation, session issuance, and user profile management.
- **Technologies:** FastAPI, PyJWT, bcrypt, MongoDB (AsyncIOMotorClient), React AuthContext.
- **Important Files:** `backend/app/routes/auth_routes.py`, `backend/app/security.py`, `backend/app/dependencies.py`, `client/src/context/AuthContext.js`.
- **Implementation Detail:** Passwords are salted and hashed using bcrypt with work factor 12. JWTs carry a 24-hour expiration (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`). Passwords are scrubbed from all downstream responses using `format_mongo_doc()`.

### 2. Role-Based Access Control (RBAC)
- **Purpose:** Strict authorization separating Patient, Doctor, and System Administrator privileges.
- **Technologies:** FastAPI Dependencies (`Depends`), HTTP 403 Forbidden exceptions.
- **Important Files:** `backend/app/dependencies.py`.
- **Implementation Detail:** Reusable route guard dependencies enforce role boundaries at the API layer:
  - `get_current_user`: Validates token signature and resolves the user.
  - `require_admin`: Verifies `isAdmin == True` or `role == "admin"`.
  - `require_doctor`: Verifies `isDoctor == True` or `role == "doctor"`.

### 3. Doctor Verification & Practice Management
- **Purpose:** Clinical onboarding workflow allowing licensed professionals to apply, get verified, and manage their clinical profiles.
- **Technologies:** MongoDB, Redis (Cache Invalidation), RabbitMQ, Ant Design Forms.
- **Important Files:** `backend/app/routes/doctor_routes.py`, `client/src/pages/ApplyDoctor.js`, `client/src/pages/doctor/Profile.js`.
- **Implementation Detail:** Doctors define daily consultation windows (`timings: ["09:00", "17:00"]`), consultation fees, specialization, and physical clinic addresses. Any updates to profile data trigger active Redis cache invalidation for the doctor directory.

### 4. Appointment Booking & Concurrency Guard
- **Purpose:** Real-time appointment scheduling with guaranteed collision prevention.
- **Technologies:** MongoDB Partial Unique Indexes, Motor Async Driver, Ant Design Date/Time Pickers.
- **Important Files:** `backend/app/database.py`, `backend/app/routes/appointment_routes.py`, `client/src/pages/BookingPage.js`.
- **Implementation Detail:** Avoids memory locks across scaled instances by delegating concurrency control to MongoDB via:
  ```python
  IndexModel(
      [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
      unique=True,
      partialFilterExpression={"status": "booked"},
      name="idx_appointments_double_booking_prevention"
  )
  ```
  Slots marked `cancelled` or `rejected` do not satisfy the filter expression, immediately reopening the slot for other patients.

### 5. Hospital Directory & Geographical Mapping
- **Purpose:** Directory of affiliated medical centers, departmental emergency services, and geospatial coordinates.
- **Technologies:** MongoDB, Redis Caching, Google Maps Embed API, Ant Design Modals.
- **Important Files:** `backend/app/routes/hospital_routes.py`, `client/src/pages/HospitalPage.js`.
- **Implementation Detail:** Hospitals contain physical addresses, lists of specialized services, and latitude/longitude coordinates. The frontend embeds Google Maps iframes dynamically based on coordinates or address queries.

### 6. Event-Driven Asynchronous Notifications
- **Purpose:** Non-blocking notification dispatch for appointment bookings, status updates, and administrative alerts.
- **Technologies:** RabbitMQ, pika, Python background worker, MongoDB.
- **Important Files:** `backend/app/queue.py`, `backend/worker.py`, `backend/app/routes/notification_routes.py`, `client/src/pages/NotificationPage.js`.
- **Implementation Detail:** When an event occurs, FastAPI publishes a persistent JSON message (`delivery_mode=2`) to RabbitMQ. The independent worker process (`worker.py`) consumes the queue with prefetch QoS 1 and manual acknowledgments (`basic_ack`). If RabbitMQ is offline, an automatic circuit fallback writes notifications directly to MongoDB without interrupting the user.

### 7. Dr. AI Medical Chatbot
- **Purpose:** Conversational symptom clarification and preliminary clinical triage.
- **Technologies:** Google Gemini API (`gemini-2.5-flash`), httpx, Web Speech API.
- **Important Files:** `backend/app/routes/chatbot_routes.py`, `client/src/pages/Chatbot.js`.
- **Implementation Detail:** Clinical guardrails are enforced via system instructions: maximum 1–2 clarifying questions, concise responses (1–3 sentences), no clinical jargon, and mandatory emergency disclaimers. Requests are rate-limited to 20 calls/min. The frontend supports browser-based speech recognition and synthesis.

---

## 5. System Design Concepts & Engineering Patterns

### Client-Server Separation & API Design
- **Concept:** Strict decoupling of presentation logic from data persistence and business rules.
- **Implementation:** React communicates with FastAPI strictly over asynchronous REST JSON endpoints prefixed with `/api/v1`. The frontend is fully decoupled and can be served from a CDN or static web server.

### Stateless Identity Management
- **Concept:** Server instances retain no session state in memory, allowing arbitrary horizontal scaling behind a load balancer.
- **Implementation:** User identities are verified via cryptographically signed JWTs passed in HTTP `Authorization: Bearer` headers. Any application instance can validate any request without cross-server session synchronization.

### Database Design & Partial Unique Indexes
- **Concept:** Enforcing application-critical invariants at the database engine level rather than relying solely on vulnerable application-level locks.
- **Implementation:** MongoDB partial unique indexes enforce single-booking rules only on documents where `status == "booked"`. This allows multiple historical records for cancelled appointments on the same slot while preventing two active bookings.

### Read-Through Caching & Event-Driven Invalidation
- **Concept:** Reducing database read pressure and query latency by caching read-heavy, semi-static directory queries in memory.
- **Implementation:** Doctor directories and hospital catalogs are cached in Redis with a 300-second TTL (`cache.py`). Mutations (such as doctor approvals or profile updates) trigger explicit cache eviction (`cache.delete(KEY_APPROVED_DOCTORS)`), preventing stale reads while maintaining low latency.

### Distributed Atomic Rate Limiting
- **Concept:** Protecting sensitive and expensive endpoints from abuse using fixed-window rate limiting.
- **Implementation:** Implemented in `rate_limiter.py` using Redis pipeline execution (`INCR` and `EXPIRE`). If Redis is unavailable, the system automatically falls back to an in-memory sliding bucket:
  - Login: 10 requests / minute
  - Registration: 5 requests / minute
  - AI Chatbot: 20 requests / minute

### Asynchronous Event Queuing & Decoupled Workers
- **Concept:** Offloading non-critical side effects (notifications, emails, audit logging) from the synchronous HTTP request-response path.
- **Implementation:** `queue.py` publishes events to a durable RabbitMQ queue (`healthease_notifications`). `worker.py` consumes messages independently with manual acknowledgments. If the broker is unreachable, direct database fallback ensures notifications are never dropped.

### High-Availability Resiliency & Connection Fallbacks
- **Concept:** Graceful degradation and multi-tier connectivity fallbacks during infrastructure disruptions.
- **Implementation:**
  - **Database:** `database.py` attempts connection to MongoDB Atlas first; if Atlas rejects the connection (e.g., dynamic IP not whitelisted, SSL handshake issues), it automatically falls back to the running local MongoDB instance (`mongodb://localhost:27017`).
  - **Cache:** If Redis is offline, caching is bypassed and rate limiting switches to an in-memory sliding window.
  - **Broker:** If RabbitMQ is down, notifications are written synchronously to MongoDB.

### Layer 7 Reverse Proxying & Load Balancing
- **Concept:** Distributing network traffic across multiple application server replicas to prevent single-instance saturation.
- **Implementation:** Nginx distributes incoming HTTP traffic across two identical FastAPI instances (`backend_1` and `backend_2`) via round-robin scheduling (`nginx/nginx.conf`).

---

## 6. Codebase Architecture & File Reference Guide

### Root Infrastructure
- `docker-compose.yml`: Defines the 6-service local topology (Nginx, 2x FastAPI, Redis, RabbitMQ, Worker) with healthchecks and network bridging.
- `nginx/nginx.conf`: Nginx configuration defining the upstream `healthease_backend` cluster and proxy headers.
- `pyrightconfig.json`: Python language server settings for static typing across the `backend` and `tests` directories.

### Backend Application (`backend/`)
- `app/main.py`: Application entry point initializing CORS middleware, operational probes (`/health`, `/ready`), and mounting the 7 API routers.
- `app/config.py`: Centralized configuration defining port, origins, JWT secret, MongoDB URI, Redis URL, and RabbitMQ parameters.
- `app/database.py`: Motor client connection management, automatic Atlas-to-local fallback, index creation, and initial administrator account bootstrapping.
- `app/security.py`: Password hashing with bcrypt, JWT creation, and signature validation.
- `app/dependencies.py`: Request dependency injection for token decoding and RBAC verification.
- `app/cache.py`: Asynchronous Redis wrapper with JSON serialization, cache retrieval, and cache eviction routines.
- `app/rate_limiter.py`: Atomic Redis rate limiter with in-memory fallback.
- `app/queue.py`: RabbitMQ event publisher with connection timeout mitigation and direct MongoDB persistence fallback.
- `app/schemas.py`: Pydantic models validating all API request and response structures.
- `worker.py`: Standalone RabbitMQ consumer daemon processing notifications and persisting them to MongoDB.

### Backend Route Modules (`backend/app/routes/`)
- `auth_routes.py`: Endpoints for user registration, login, `/getUserData`, and profile updates.
- `doctor_routes.py`: Endpoints for doctor application, directory listings (cached), single doctor retrieval, and profile updates.
- `appointment_routes.py`: Availability checking, atomic slot reservation, appointment cancellation, and status management.
- `hospital_routes.py`: Hospital directory listings (cached) and administrative hospital creation.
- `admin_routes.py`: System overview metrics, doctor credential review (approval/rejection), and user account management.
- `notification_routes.py`: In-app notification retrieval, mark-as-read, and deletion endpoints.
- `chatbot_routes.py`: Proxies conversational requests to Google Gemini with rate limits and clinical system instructions.

### Frontend Application (`client/src/`)
- `api.js`: Central Axios HTTP client with JWT interceptor and 401 unauthenticated redirect handling.
- `context/AuthContext.js`: Global React Context tracking current user state, token lifecycle, and login/logout methods.
- `App.js`: Root routing component mapping views to public, protected, and role-guarded routes.
- `components/DoctorList.js`: Reusable practitioner card rendering specialization, experience, fees, and formatted hours.
- `components/Layout.js`: Main layout wrapper providing role-specific navigation, notification bell count, and header.
- `components/ProtectedRoute.js`: Route wrapper ensuring unauthenticated visitors are redirected to `/login`.
- `pages/HomePage.js`: Role-adaptive landing dashboard displaying Admin statistics, Doctor appointment agendas, or the Patient specialist directory.
- `pages/BookingPage.js`: Appointment reservation interface with date/time pickers and embedded Google Maps clinic locator.
- `pages/Chatbot.js`: Conversational AI triage interface supporting text input, speech recognition, and speech synthesis.
- `pages/HospitalPage.js`: Healthcare directory with service tags and modal-based map rendering.

---

## 7. AI Assistant Architecture (Dr. AI)

### Model Integration & System Prompts
The medical chatbot utilizes Google's `gemini-2.5-flash` model accessed via direct REST calls using `httpx.AsyncClient`. It is governed by a strict clinical system prompt:

```text
"You are Dr. AI, a friendly human doctor. NO complex jargon, NO emojis, NO markdown. 
Keep responses to 1-3 short sentences. STRICT RULE: You are allowed to ask a maximum of 1 or 2 
questions TOTAL to understand the patient's symptoms. Once you have enough details, STOP asking 
questions. Provide a clear, practical health solution, medicine suggestion, or home remedy. 
After providing the solution, politely conclude the conversation without asking anything else. 
Disclaimer: For severe emergencies, urge immediate visit to the nearest hospital."
```

### Pipeline & Resilience
1. **Rate Limiting:** Guarded by `rate_limiter.py` at 20 requests per minute per IP to prevent API budget exhaustion.
2. **Payload Construction:** Conversation histories are formatted into Gemini's `contents` payload format.
3. **Timeout Protection:** Outbound calls use a 30-second timeout. If the external API times out or the key is unconfigured, user-friendly fallback messages are returned without crashing the backend.
4. **Voice Interface:** The frontend integrates the browser's native `webkitSpeechRecognition` for speech-to-text input and `SpeechSynthesisUtterance` for voice output, prioritizing clean, conversational voices.

---

## 8. Performance, Latency, and Optimization Analysis

### Optimization Mechanisms

| Optimization Technique | Target Bottleneck | Implementation Mechanics | Responsible Files | Theoretical Benefit | Status |
|---|---|---|---|---|---|
| **In-Memory Caching** | Repetitive database reads on static directories | Stores JSON-serialized doctor and hospital lists in Redis with 300s TTL. | `backend/app/cache.py`, `doctor_routes.py`, `hospital_routes.py` | Eliminates disk I/O and query parsing overhead on repeated requests. | Expected / Designed (Not quantitatively measured) |
| **Compound Partial Indexing** | Full table scans & race condition locks | Partial unique index on `{ doctorId, date, time }` where `{ status: "booked" }`. | `backend/app/database.py` | Reduces slot lookup complexity to O(log N) and enforces atomic uniqueness in the database engine. | Expected / Designed (Index verified active) |
| **Asynchronous Non-Blocking I/O** | Thread starvation under high concurrent load | Built on Python's `asyncio` event loop with Motor async MongoDB driver and httpx. | Entire backend (`main.py`, `database.py`, `routes/`) | Serves concurrent I/O-bound requests on a single Python thread without blocking on network wait. | Expected / Designed (Standard AsyncIO model) |
| **Event-Driven Task Offloading** | Increased request latency from notification writes | Publishes lightweight AMQP messages to RabbitMQ; background worker handles DB persistence. | `backend/app/queue.py`, `backend/worker.py` | Removes secondary database writes from the critical HTTP response path. | Expected / Designed (Decoupled architecture) |
| **Database Connection Pooling** | TCP handshake overhead on repeated queries | Configures Motor client with `minPoolSize=10` and `maxPoolSize=50`. | `backend/app/database.py` | Reuses open TCP connections, eliminating TLS/TCP handshake latency on every request. | Expected / Designed (Standard connection pool) |
| **Layer 7 Load Balancing** | CPU saturation on single-instance processing | Nginx upstream distributes HTTP traffic across two FastAPI instances via round-robin. | `nginx/nginx.conf`, `docker-compose.yml` | Distributes CPU-intensive operations (bcrypt hashing, JSON serialization) across multiple cores. | Expected / Designed (Load balanced topology) |

> **Performance Verification Note:** The performance benefits outlined above are structural architectural optimizations implemented in the code. Their positive impacts on latency and throughput are theoretically expected based on established distributed systems patterns, but specific latency reduction figures or benchmark percentages have **not** been formally benchmarked or measured in this environment. Quantitative performance claims should only be made after conducting formal load tests.
