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
---

## 9. Comprehensive Feature Catalog & Complete Workflow Analysis

HealthEase implements a complete, end-to-end clinical operations lifecycle spanning three distinct user personas: **Patients**, **Verified Healthcare Providers (Doctors)**, and **System Administrators**. Every workflow is backed by strict role-based access control, distributed state management, and real-time operational feedback.

---

### 9.1 Patient Experience & Clinical Workflows

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant React as React SPA (Client)
    participant Nginx as Nginx Load Balancer (:8080)
    participant API as FastAPI Backend (:8000)
    participant Redis as Redis Cache / Rate Limiter
    participant Mongo as MongoDB Atlas
    participant Rabbit as RabbitMQ Broker
    participant Worker as Background Worker Daemon

    Patient->>React: Browse Landing Portal & Click Login
    React->>Nginx: POST /api/v1/user/login (email, password)
    Nginx->>API: Route Request
    API->>Redis: Check Rate Limit (10 req/min)
    Redis-->>API: Rate Limit OK
    API->>Mongo: Find User by Email & Verify Bcrypt Hash
    Mongo-->>API: User Record
    API-->>React: HTTP 200 { success: true, token: JWT, user: {...} }
    React->>React: Store JWT in localStorage & Hydrate AuthContext

    Patient->>React: View Doctor Directory (/dashboard)
    React->>Nginx: GET /api/v1/user/getAllDoctors (Bearer Token)
    Nginx->>API: Route Request
    API->>Redis: GET healthease:doctors:approved
    alt Cache Hit
        Redis-->>API: Return Cached Doctors List
    else Cache Miss
        API->>Mongo: Query doctors where status == "approved"
        Mongo-->>API: Doctors List
        API->>Redis: SETEX healthease:doctors:approved (TTL 300s)
    end
    API-->>React: Return Approved Doctors
    React-->>Patient: Render Specialist Cards (Timings, Address, Fee)

    Patient->>React: Select Doctor & View Booking Page
    React->>Nginx: POST /api/v1/doctor/getDoctorById (doctorId)
    Nginx->>API: Route Request
    API->>Mongo: Query doctors by _id
    Mongo-->>API: Doctor Details
    API-->>React: Doctor Data & Embedded Google Map
    React-->>Patient: Render Form & Embedded Clinic Map

    Patient->>React: Pick Date & Time Slot -> Click "Check Availability"
    React->>Nginx: POST /api/v1/user/booking-availbility
    Nginx->>API: Route Request
    API->>Mongo: Query appointments (doctorId, date, time, status: "booked")
    Mongo-->>API: Null (Available)
    API-->>React: { success: true, message: "Slot is Available!" }

    Patient->>React: Click "Confirm Booking Immediately"
    React->>Nginx: POST /api/v1/user/book-appointment
    Nginx->>API: Route Request
    API->>Redis: Check Rate Limit (10 req/min)
    Redis-->>API: Rate Limit OK
    API->>Mongo: Insert appointment with status: "booked"
    Note over API,Mongo: Database Partial Unique Index Guard Prevents Double-Booking
    Mongo-->>API: Success (InsertedId)
    API->>Rabbit: Publish 'appointment-booked' Event (delivery_mode=2)
    API->>Rabbit: Publish 'appointment-confirmed' Event (delivery_mode=2)
    API-->>React: HTTP 200 { success: true, message: "Appointment Booked Successfully" }
    Rabbit->>Worker: Consume Event
    Worker->>Mongo: Insert Notification Document for Doctor & Patient
    React-->>Patient: Navigate to /appointments (Confirmed Booking)
```

#### 1. Public Landing Portal & Role Gateways (`client/src/pages/LandingPage.js`)
- **Portal Separation:** The root URL (`/`) serves an interactive marketing and portal entry point. Visitors can choose their designated login gate:
  - **Patient Portal:** Directs individuals seeking consultations, directory search, and telehealth.
  - **Doctor Portal:** Dedicated entry for verified practitioners to manage clinic hours and daily patient agendas.
  - **Admin Portal:** System administration doorway for credential verification, user moderation, and platform metrics.
- **Session Bypassing:** Integrated with `PublicRoute.js`. If an already authenticated session accesses `/`, the user is immediately redirected to `/dashboard` to avoid redundant login screens.

#### 2. Patient Registration & Rate-Limiting (`backend/app/routes/auth_routes.py`)
- **Endpoint:** `POST /api/v1/user/register`
- **Security Invariant:** Enforces strict role isolation. Public registration payloads are constrained to standard patient accounts (`role: "patient", isAdmin: False, isDoctor: False`). Any malicious attempt to pass administrative or clinical elevation flags in JSON payloads is completely ignored.
- **Cryptographic Protection:** Passwords are typed, validated (min length 6 characters), salted with dynamic entropy, and encrypted using `bcrypt.hashpw()` with work factor 12.
- **Granular Rate-Limiting:** IP-based fixed-window limiter (`check_rate_limit(key_prefix="register", max_requests=5, window_seconds=60)`) throttles automated account generation and bot spam.

#### 3. Authentication, Token Issuance & Client Interception
- **Endpoint:** `POST /api/v1/user/login`
- **Credential Validation:** Compares candidate passwords against stored bcrypt hashes using timing-safe comparisons (`bcrypt.checkpw()`).
- **Cryptographic Session Token:** Issues an HMAC-SHA256 signed JSON Web Token carrying claims:
  - `sub`: User unique ObjectID string.
  - `id`: Legacy identifier alias for backward compatibility.
  - `email`: User registered email address.
  - `role`: System authorization role (`patient`, `doctor`, or `admin`).
  - `isAdmin` & `isDoctor`: Boolean permission flags.
  - `exp`: 24-hour expiration timestamp (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`).
- **Centralized Axios Interceptor (`client/src/api.js`):**
  - **Outbound Injection:** Automatically attaches `Authorization: Bearer <token>` to every HTTP request header from `localStorage.getItem("token")`.
  - **Inbound 401 Interception:** Catches HTTP 401 Unauthorized responses globally, removes expired tokens from `localStorage`, and safely resets authentication context state.

#### 4. Specialist Doctor Directory & Filtered Exploration (`client/src/pages/HomePage.js`)
- **Directory Endpoint:** `GET /api/v1/user/getAllDoctors`
- **In-Memory Caching:** Results are cached in Redis under key `healthease:doctors:approved` with a 300-second TTL. If cached data is present, database queries are bypassed entirely.
- **Card Presentation:** Renders responsive Ant Design cards presenting:
  - Doctor full name with honorific (`Dr. {firstName} {lastName}`).
  - Medical specialization badge (e.g., Cardiologist, Dermatologist, Neurologist).
  - Physical practice address with map indicator.
  - Consultation fee denominated in Indian Rupees (`Rs. {feesPerCunsultation}`).
  - Daily operating consultation hours.
  - Dual action buttons: "Book Clinic Visit" and "Video Consult".

#### 5. Interactive Appointment Booking & Slot Availability Pre-Check (`client/src/pages/BookingPage.js`)
- **Practitioner Fetch:** `POST /api/v1/doctor/getDoctorById` fetches full doctor details including registered consultation windows.
- **Temporal Slot Selection:** Patients select consultation dates and times via Ant Design's `DatePicker` (formatted `DD-MM-YYYY`) and `TimePicker` (formatted `HH:mm`).
- **Availability Pre-Check:** `POST /api/v1/user/booking-availbility` executes a preliminary non-locking search on `appointments` where `{ doctorId, date, time, status: "booked" }`. Returns immediate green/red UI feedback.

#### 6. Atomic Concurrency Slot Reservation & Double-Booking Prevention (`backend/app/routes/appointment_routes.py`)
- **Booking Endpoint:** `POST /api/v1/user/book-appointment`
- **Immediate Confirmation Guarantee:** HealthEase eliminates obsolete multi-step "pending doctor approval" delays. When a patient books an available slot, the appointment is marked immediately as `"booked"`.
- **Database Engine Concurrency Guard:** Protects against split-second simultaneous requests from multiple users on the same slot:
  ```python
  IndexModel(
      [("doctorId", ASCENDING), ("date", ASCENDING), ("time", ASCENDING)],
      unique=True,
      partialFilterExpression={"status": "booked"},
      name="idx_appointments_double_booking_prevention",
  )
  ```
  If a race condition occurs, MongoDB's storage engine enforces the partial unique index and raises a `DuplicateKeyError`. The backend catches this exception and returns an informative HTTP response (`{ success: False, message: "Slot Conflict: This appointment slot was just booked by another patient. Please select another time." }`), preventing data corruption and double bookings.

#### 7. Dynamic Clinic Geolocation via Embedded Google Maps (`client/src/pages/BookingPage.js`)
- **Interactive Map Frame:** On the booking page, an integrated Google Maps iframe dynamically renders the doctor's exact clinic location side-by-side with the booking form:
  ```html
  <iframe
    title="clinic map"
    width="100%"
    height="100%"
    style="min-height: 480px; border: none;"
    loading="lazy"
    allowfullscreen
    referrerpolicy="no-referrer-when-downgrade"
    src="https://maps.google.com/maps?q=${encodeURIComponent(doctor.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed"
  />
  ```
- **Zero Third-Party Cost:** Uses Google Maps Search Embed without requiring high-cost client-side JavaScript SDK billing, ensuring high reliability and zero rate exhaustion.

#### 8. Telehealth Video Consultation Request Workflow (`client/src/pages/HomePage.js`)
- **Online Consultation Request:** Patients can request an online telehealth session directly from any doctor card via the "Video Consult" button.
- **Ant Design Modal Capture:** Collects patient direct phone number, optional WhatsApp number, and email.
- **Specialized Slot Routing:** Submits an appointment record with `date: "VIDEO-CONSULT"` and `time: "ONLINE"`. Dispatches a notification to the doctor's dashboard containing patient telecommunication details so the doctor can initiate a video call or send a meeting link.

#### 9. Patient Appointment History & Slot Self-Cancellation (`client/src/pages/Appointments.js`)
- **Patient History:** `GET /api/v1/user/user-appointments` fetches all appointments booked by the authenticated patient. User isolation ensures patients can never view another patient's medical bookings.
- **Status Pills:** Bookings display visual Ant Design tags: `BOOKED` (green) or `CANCELLED` (default gray).
- **Self-Cancellation Action:** Patients can cancel active appointments via `POST /api/v1/user/cancel-appointment`.
- **Slot Release Mechanism:** Updating the status to `"cancelled"` releases the document from satisfying MongoDB's partial filter expression `{ status: "booked" }`. This immediately re-opens the doctor's slot for other patients to book in real time.
- **Status Change Event:** Dispatches an asynchronous `appointment-status-updated` event to the doctor's notification inbox.

#### 10. Regional Healthcare Centers & Emergency Directory (`client/src/pages/HospitalPage.js`)
- **Catalog Endpoint:** `GET /api/v1/hospitals` (Cached in Redis under `healthease:hospitals:all`).
- **Departmental Services:** Renders healthcare facilities with physical address, contact telephone, description, and Ant Design service tags (e.g., "Emergency", "Cardiology", "ICU", "Pediatrics", "Radiology").
- **Interactive Hospital Map Modal:** Clicking "View on Map" opens a full-screen modal embedding Google Maps centered on the hospital's geographic address or coordinates.

#### 11. Multi-Channel In-App Notification Center (`client/src/pages/NotificationPage.js`)
- **Badge Counter:** The top application navigation bar displays a dynamic Ant Design `Badge` displaying the count of unread notifications.
- **Tabbed Organization:**
  - **Unread Tab:** Displays actionable alerts with deep-link navigation paths (e.g., clicking an appointment alert navigates to `/appointments`).
  - **Read Tab:** Historical record of acknowledged messages.
- **Batch Actions:**
  - **Mark All Read (`POST /api/v1/user/get-all-notification`):** Moves all unread alerts into the `seennotification` list and updates `notifications` collection documents with `read: True`.
  - **Delete All Read (`POST /api/v1/user/delete-all-notification`):** Permanently purges read notifications to keep patient accounts clean.

#### 12. Patient Profile Management (`client/src/pages/UserProfile.js`)
- **Profile Endpoint:** `POST /api/v1/user/update-profile`
- **Self-Service Modification:** Allows patients to modify their full name and registered email address.
- **Email Conflict Guard:** Validates that the requested email address is not already registered to another account in MongoDB.

---

### 9.2 Doctor Experience & Clinical Practice Workflows

```mermaid
sequenceDiagram
    autonumber
    actor Doctor
    participant React as React SPA (Client)
    participant Nginx as Nginx Load Balancer (:8080)
    participant API as FastAPI Backend (:8000)
    participant Redis as Redis Cache
    participant Mongo as MongoDB Atlas
    participant Rabbit as RabbitMQ Broker
    participant Worker as Background Worker Daemon
    actor Admin

    Note over Doctor,Admin: 1. Doctor Privilege Application Workflow
    Doctor->>React: Fill Application Form (/apply-doctor)
    React->>Nginx: POST /api/v1/user/apply-doctor
    Nginx->>API: Route Request
    API->>Mongo: Insert Doctor Application (status: "pending")
    API->>Rabbit: Publish 'apply-doctor-request' to Admin
    Rabbit->>Worker: Consume Event & Save Notification in Mongo
    API-->>React: Application Submitted Successfully

    Note over Doctor,Admin: 2. Administrative Verification & Elevation
    Admin->>React: Open /admin/doctors & Click "Approve"
    React->>Nginx: POST /api/v1/admin/changeAccountStatus (status: "approved")
    Nginx->>API: Route Request
    API->>Mongo: Update doctor status to "approved"
    API->>Mongo: Elevate user (isDoctor: true, role: "doctor")
    API->>Redis: Invalidate Doctor Cache (healthease:doctors:approved)
    API->>Rabbit: Publish 'doctor-account-request-updated' to Doctor
    API-->>React: Account Status Updated

    Note over Doctor,Admin: 3. Clinical Agenda & Practice Management
    Doctor->>React: Log in -> Access Doctor Dashboard
    React->>Nginx: GET /api/v1/doctor/doctor-appointments
    Nginx->>API: Route Request (require_doctor Dependency Guard)
    API->>Mongo: Query appointments for Doctor's _id
    Mongo-->>API: Doctor Appointments
    API-->>React: Return Appointments List
    React-->>Doctor: Render Clinical Dashboard & Agenda Table

    Doctor->>React: Update Consultation Timings & Fees (/doctor/profile)
    React->>Nginx: POST /api/v1/doctor/updateProfile
    Nginx->>API: Route Request
    API->>Mongo: Update doctor record
    API->>Redis: Evict Doctor Cache
    API-->>React: Profile Updated Successfully
```

#### 1. Doctor Privilege Application Submission (`client/src/pages/ApplyDoctor.js`)
- **Endpoint:** `POST /api/v1/user/apply-doctor`
- **Application Payload:**
  - **Personal Details:** First Name, Last Name, Direct Contact Phone, Professional Email, Clinic/Portfolio Website, Physical Practice Address.
  - **Clinical Credentials:** Specialization (e.g., "Orthopedic Surgeon"), Total Years of Experience, Consultation Fee in INR, and Daily Operating Consultation Timings (`["09:00", "17:00"]`).
- **Initial Verification State:** The record is inserted into `doctors` with `status: "pending"`.
- **Admin Alert Event:** Publishes an `apply-doctor-request` message to RabbitMQ. The worker persists this notification to the administrator's inbox with `onClickPath: "/admin/doctors"`.

#### 2. Clinical Dashboard & Daily Practice Metrics (`client/src/pages/HomePage.js`)
- When a verified doctor logs in, the home dashboard automatically adapts into a Clinical Operations Command Center displaying real-time practice metrics:
  - **Active Appointments:** Count of confirmed upcoming bookings (`status: "booked"`).
  - **Total Bookings:** Lifetime patient reservation count.
  - **Cancelled Slots:** Count of released consultations (`status: "cancelled"`).
  - **Verification Status:** Live badge confirming active verification status.
  - **Quick Action Triggers:** One-click shortcuts to "Manage Appointments", "Update Clinic Timings", and "Hospital Affiliations".

#### 3. Doctor Appointments Management & Status Controls (`client/src/pages/doctor/DoctorAppointments.js`)
- **Endpoint:** `GET /api/v1/doctor/doctor-appointments`
- **Authorization Guard:** Protected by `require_doctor` dependency. Rejects unverified or standard patient tokens with HTTP 403 Forbidden.
- **Isolated Query Scope:** Queries MongoDB strictly matching the logged-in doctor's `_id` or `userId`. Doctors cannot view other doctors' schedules.
- **Agenda Table:** Presents patient full name, formatted appointment date, consultation time, and current status.
- **Status Modification Action:**
  - **Approve / Reject:** Doctors can update appointment states via `POST /api/v1/doctor/update-status`.
  - Rejection automatically changes the appointment status to `"cancelled"`, immediately freeing up the clinic slot and alerting the patient via an asynchronous notification.

#### 4. Practice Profile, Timings & Fee Management (`client/src/pages/doctor/Profile.js`)
- **Endpoint:** `POST /api/v1/doctor/updateProfile`
- **Dynamic Pre-Hydration:** Automatically loads existing doctor data via `POST /api/v1/doctor/getDoctorInfo`. Timings are parsed using `moment(time, "HH:mm")` into interactive Ant Design `TimePicker.RangePicker` inputs.
- **Protected Fields:** Prevents tampering with internal fields (`_id`, `userId`, `status`, `createdAt`).
- **Cache Eviction Hook:** On successful profile update, automatically triggers `cache.invalidate_doctors(str(doctor["_id"]))` in Redis. This ensures patients browsing the directory immediately see updated consultation fees and timings.

#### 5. Hospital Facility Registration (`client/src/pages/HospitalPage.js`)
- **Privileged Access:** Doctors and administrators possess authorization to register new healthcare centers via `POST /api/v1/hospitals`.
- **Form Data:** Captures hospital title, address, emergency contact, departmental service tags, and latitude/longitude coordinates.

---

### 9.3 System Administrator Governance Workflows

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant React as React SPA (Client)
    participant Nginx as Nginx Load Balancer (:8080)
    participant API as FastAPI Backend (:8000)
    participant Redis as Redis Cache
    participant Mongo as MongoDB Atlas
    participant Rabbit as RabbitMQ Broker

    Admin->>React: Log in to Admin Portal
    React->>Nginx: GET /api/v1/admin/stats
    Nginx->>API: Route Request (require_admin Dependency Guard)
    API->>Mongo: Aggregate Counts (users, doctors, appointments, hospitals)
    Mongo-->>API: System Statistics
    API-->>React: Return Stats JSON
    React-->>Admin: Render Admin Dashboard (Live System Gauges)

    Admin->>React: Review Doctor Applications (/admin/doctors)
    React->>Nginx: GET /api/v1/admin/getAllDoctors
    Nginx->>API: Route Request
    API->>Mongo: Query doctors collection
    Mongo-->>API: Doctor Applications List
    API-->>React: Return All Doctors
    React-->>Admin: Render Applications Table (Pending & Approved)

    Admin->>React: Click "Approve" for Doctor
    React->>Nginx: POST /api/v1/admin/changeAccountStatus
    Nginx->>API: Route Request
    API->>Mongo: Update doctor status -> "approved"
    API->>Mongo: Elevate user -> isDoctor: true, role: "doctor"
    API->>Redis: Invalidate Doctor Directory Cache
    API->>Rabbit: Publish In-App Notification to Doctor
    API-->>React: { success: true, message: "Account Status Updated" }
    React-->>Admin: Refresh Doctors Table (Action Taken)

    Admin->>React: Manage User Accounts (/admin/users)
    React->>Nginx: GET /api/v1/admin/getAllUsers
    Nginx->>API: Route Request
    API->>Mongo: Query users collection
    Mongo-->>API: Sanitized User Records (Passwords Scrubbed)
    API-->>React: Return Users List
    React-->>Admin: Render Users Governance Table

    Admin->>React: Click "Block" on Bad User
    React->>Nginx: POST /api/v1/admin/blockUser
    Nginx->>API: Route Request
    API->>Mongo: Delete user document & associated doctor records
    API->>Redis: Invalidate Doctor Cache
    API-->>React: { success: true, message: "User Blocked Successfully" }
    React-->>Admin: Refresh Users Table
```

#### 1. System Administration Command Dashboard (`client/src/pages/HomePage.js`)
- **Endpoint:** `GET /api/v1/admin/stats`
- **Real-Time System Aggregations:**
  - **Total Registered Users:** Active patient accounts in MongoDB.
  - **Verified Doctors:** Clinical providers with `status == "approved"`.
  - **Pending Applications:** Queued doctor credential applications requiring review.
  - **Total Appointments:** Total platform consultations booked across all clinics.
  - **Total Hospitals:** Medical facilities registered in the regional directory.

#### 2. Doctor Credential Verification Governance (`client/src/pages/admin/Doctors.js`)
- **Endpoint:** `GET /api/v1/admin/getAllDoctors`
- **Application Review Grid:** Displays every doctor application with applicant full name, contact phone, specialization, fees, and current status.
- **Dual Decision Controls:**
  - **Approve:** Invokes `POST /api/v1/admin/changeAccountStatus` with `status: "approved"`.
  - **Reject:** Invokes `POST /api/v1/admin/changeAccountStatus` with `status: "rejected"`.
- **System Elevation Pipeline:**
  1. Sets `status: "approved"` in `doctors`.
  2. Updates the associated user record in `users` (`isDoctor: True, role: "doctor"`).
  3. Purges Redis cache key `healthease:doctors:approved`.
  4. Publishes a real-time notification to the applicant via RabbitMQ.
  5. UI dynamically displays disabled "Action Taken" state to prevent duplicate submissions.

#### 3. User Moderation & Account Governance (`client/src/pages/admin/Users.js`)
- **Endpoint:** `GET /api/v1/admin/getAllUsers`
- **Password Scrubbing:** All password hashes are automatically stripped at the database layer before payload serialization.
- **Account Block / Deletion Action:**
  - **Endpoint:** `POST /api/v1/admin/blockUser`
  - **Self-Protection Guard:** Explicitly prevents administrators from deleting or blocking their own accounts (`str(block_id) == admin_id`).
  - **Cascading Cleanup:** Deletes the user document from `users` and removes any associated records from `doctors`.
  - **Directory Cache Invalidation:** Automatically evicts the Redis doctor cache to keep directories accurate.

#### 4. Automated Administrator Bootstrapping (`backend/app/database.py`)
- **Zero Manual DB Injection:** When FastAPI starts up, `bootstrap_admin()` runs an idempotent MongoDB upsert:
  ```python
  await db_state.db.users.update_one(
      {"email": settings.ADMIN_EMAIL},
      {
          "$setOnInsert": {
              "name": settings.ADMIN_NAME,
              "password": get_password_hash(settings.ADMIN_PASSWORD),
              "isDoctor": False,
              "notification": [],
              "seennotification": [],
              "createdAt": now,
          },
          "$set": {
              "isAdmin": True,
              "role": "admin",
              "updatedAt": now,
          },
      },
      upsert=True,
  )
  ```
- **Concurrency Safe:** Catches `DuplicateKeyError` if multiple backend instances attempt bootstrapping at the exact same millisecond.

---

## 10. Exhaustive REST API Specification & Endpoint Directory

Every endpoint in the HealthEase API is documented below with its HTTP method, URL path, authorization role, rate-limiting rules, request payload schema, and response format.

### 10.1 Authentication & User Routes (`/api/v1/user/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `POST` | `/api/v1/user/register` | Public | 5 req / min | `UserRegisterRequest`<br>`{ name, email, password }` | Registers a new patient account with bcrypt hash. Returns `{ success: true, message: "Register Successfully" }`. |
| `POST` | `/api/v1/user/login` | Public | 10 req / min | `UserLoginRequest`<br>`{ email, password }` | Validates credentials and returns signed JWT token + user profile: `{ success: true, token: "...", data: {...} }`. |
| `GET` / `POST` | `/api/v1/user/getUserData` | Authenticated | None | None | Hydrates client session from JWT header. Returns `{ success: true, data: { _id, name, email, isAdmin, isDoctor, role, ... } }`. |
| `GET` | `/api/v1/user/me` | Authenticated | None | None | Alias endpoint for current user profile. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/user/update-profile` | Authenticated | None | `UserProfileUpdateRequest`<br>`{ name?, email? }` | Updates authenticated user name and/or email with conflict checking. Returns `{ success: true, data: {...} }`. |

### 10.2 Doctor Routes (`/api/v1/doctor/` and `/api/v1/user/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `POST` | `/api/v1/user/apply-doctor` | Authenticated (Patient) | None | `DoctorApplyRequest`<br>`{ firstName, lastName, phone, email, website, address, specialization, experience, feesPerCunsultation, timings }` | Submits doctor application in `pending` status. Dispatches RabbitMQ alert to admin. Returns `{ success: true, message: "..." }`. |
| `GET` | `/api/v1/user/getAllDoctors` | Authenticated | None | None | Retrieves all verified doctors (`status == "approved"`). Served from Redis cache (300s TTL). Returns `{ success: true, data: [...] }`. |
| `GET` | `/api/v1/doctor/getAllDoctors` | Authenticated | None | None | Alias endpoint for approved doctor directory. Cached in Redis. Returns `{ success: true, data: [...] }`. |
| `POST` | `/api/v1/doctor/getDoctorById` | Authenticated | None | `{ doctorId: string }` | Fetches single doctor profile for booking page display. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/doctor/getDoctorInfo` | Authenticated | None | `{ userId?: string }` | Fetches doctor profile belonging to the logged-in user. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/doctor/updateProfile` | Approved Doctor | None | `DoctorProfileUpdateRequest`<br>`{ address, timings, feesPerCunsultation, ... }` | Updates doctor profile and invalidates Redis cache. Returns `{ success: true, message: "...", data: {...} }`. |
| `GET` | `/api/v1/doctor/doctor-appointments` | Approved Doctor | None | None | Retrieves all appointments booked with the logged-in doctor. Isolated per doctor. Returns `{ success: true, data: [...] }`. |

### 10.3 Appointment Routes (`/api/v1/user/` and `/api/v1/doctor/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `POST` | `/api/v1/user/booking-availbility` | Authenticated | None | `CheckAvailabilityRequest`<br>`{ doctorId, date, time }` | Pre-checks if slot is available. Returns `{ success: true/false, message: "..." }`. |
| `POST` | `/api/v1/user/booking-availability` | Authenticated | None | `CheckAvailabilityRequest`<br>`{ doctorId, date, time }` | Alias with standard spelling. Returns `{ success: true/false, message: "..." }`. |
| `POST` | `/api/v1/user/book-appointment` | Authenticated | 10 req / min | `BookAppointmentRequest`<br>`{ doctorId, date, time, doctorInfo, userInfo }` | Atomic slot booking. Database partial unique index prevents double booking. Dispatches RabbitMQ alerts. Returns `{ success: true, data: {...} }`. |
| `GET` | `/api/v1/user/user-appointments` | Authenticated (Patient) | None | None | Fetches all appointments for the authenticated patient. Returns `{ success: true, data: [...] }`. |
| `POST` | `/api/v1/user/cancel-appointment` | Authenticated (Patient / Doctor / Admin) | None | `{ appointmentId: string, status?: "cancelled" }` | Cancels appointment, immediately freeing the slot for other patients. Returns `{ success: true, message: "..." }`. |
| `POST` | `/api/v1/doctor/cancel-appointment` | Doctor / Admin | None | `{ appointmentId: string, status?: "cancelled" }` | Doctor cancellation alias. Returns `{ success: true, message: "..." }`. |
| `POST` | `/api/v1/doctor/update-status` | Doctor / Admin | None | `{ appointmentsId: string, status: "approved"/"reject" }` | Updates appointment status and dispatches patient notification. Returns `{ success: true, message: "..." }`. |

### 10.4 Hospital Catalog Routes (`/api/v1/hospitals/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `GET` | `/api/v1/hospitals` | Authenticated | None | None | Lists all registered hospitals and emergency departments. Cached in Redis (300s TTL). Returns `{ success: true, data: [...] }`. |
| `GET` | `/api/v1/hospitals/{hospital_id}` | Authenticated | None | None | Retrieves single hospital details by ID. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/hospitals` | Doctor or Admin | None | `HospitalCreateRequest`<br>`{ name, address, description, services, contact, latitude, longitude }` | Creates hospital center and invalidates Redis cache. Returns `{ success: true, data: {...} }`. |
| `PUT` | `/api/v1/hospitals/{hospital_id}` | Doctor or Admin | None | `HospitalUpdateRequest`<br>`{ name?, address?, services?, ... }` | Updates hospital center and invalidates Redis cache. Returns `{ success: true, data: {...} }`. |

### 10.5 Administrator Governance Routes (`/api/v1/admin/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/stats` | Administrator | None | None | Returns aggregated system metrics: `{ totalUsers, approvedDoctors, pendingDoctors, totalAppointments, totalHospitals }`. |
| `GET` | `/api/v1/admin/dashboard-stats` | Administrator | None | None | Alias endpoint for system metrics. Returns `{ success: true, data: {...} }`. |
| `GET` | `/api/v1/admin/getAllUsers` | Administrator | None | None | Lists all registered users (passwords scrubbed). Returns `{ success: true, data: [...] }`. |
| `GET` | `/api/v1/admin/getAllDoctors` | Administrator | None | None | Lists all doctor applicants with status. Returns `{ success: true, data: [...] }`. |
| `POST` | `/api/v1/admin/changeAccountStatus` | Administrator | None | `ChangeAccountStatusRequest`<br>`{ doctorId, status: "approved"/"rejected" }` | Approves or rejects doctor application. Promotes user, invalidates Redis cache, notifies doctor. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/admin/blockUser` | Administrator | None | `BlockUserRequest`<br>`{ blockId: string }` | Deletes user and associated doctor profiles. Self-blocking prevented. Returns `{ success: true, message: "..." }`. |

### 10.6 Notification Routes (`/api/v1/user/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `GET` | `/api/v1/user/notifications` | Authenticated | None | None | Fetches all in-app notifications for authenticated user from `notifications` collection. Returns `{ success: true, data: [...] }`. |
| `POST` | `/api/v1/user/get-all-notification` | Authenticated | None | `{}` | Moves notifications from `notification` to `seennotification` array and marks `read: True` in collection. Returns `{ success: true, data: {...} }`. |
| `POST` | `/api/v1/user/delete-all-notification` | Authenticated | None | `{}` | Purges read notifications from `seennotification` and deletes read collection documents. Returns `{ success: true, data: {...} }`. |

### 10.7 AI Medical Assistant Routes (`/api/v1/chatbot/`)

| Method | Endpoint | Required Role | Rate Limit | Request Body | Description & Response Format |
|---|---|---|---|---|---|
| `POST` | `/api/v1/chatbot/chat` | Authenticated | 20 req / min | `ChatbotRequest`<br>`{ chatHistory: [ { role, parts: [{ text }] } ] }` | Proxies conversational symptoms to Google Gemini with clinical triage system prompt. Returns `{ success: true, reply: "..." }`. |

### 10.8 Operational & Health Probes

| Method | Endpoint | Required Role | Purpose | Response Format |
|---|---|---|---|---|
| `GET` | `/health` | Public | Liveness probe for orchestrators and load balancers. | `HTTP 200 { status: "healthy", service: "HealthEase", timestamp: "..." }` |
| `GET` | `/ready` | Public | Readiness probe verifying live ping to MongoDB and Redis connectivity. | `HTTP 200/503 { status: "ready"/"not_ready", dependencies: { mongodb: "connected", redis: "connected" } }` |
| `GET` | `/` | Public | Root API discovery endpoint. | `HTTP 200 { message: "HealthEase API is running", documentation: "/docs" }` |
| `GET` | `/lb-health` | Public | Dedicated Nginx load balancer health probe. | `HTTP 200 { status: "UP", balancer: "nginx", cluster: "healthease_backend" }` |
| `GET` | `/docs` | Public | Interactive OpenAPI Swagger UI documentation. | HTML / Swagger interface. |
| `GET` | `/redoc` | Public | OpenAPI ReDoc documentation view. | HTML / ReDoc interface. |

---

## 11. Comprehensive Database Architecture & Collection Schemas

HealthEase is backed by **MongoDB** (Atlas cloud cluster with automatic local fallback) utilizing non-blocking asynchronous coroutines via the **Motor** driver.

### 11.1 Document Schemas

#### 1. `users` Collection Schema
```json
{
  "_id": "ObjectId('65f1234567890abcdef12345')",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "$2b$12$eX4mP1eHaShEdPaSsWoRdStrInG...",
  "isAdmin": false,
  "isDoctor": false,
  "role": "patient",
  "notification": [
    {
      "type": "appointment-confirmed",
      "message": "Your appointment with Dr. Sanjeev Kapoor is confirmed!",
      "onClickPath": "/appointments",
      "createdAt": "2026-10-12T07:30:00Z",
      "read": false
    }
  ],
  "seennotification": [],
  "createdAt": "2026-10-12T07:00:00Z",
  "updatedAt": "2026-10-12T07:30:00Z"
}
```

#### 2. `doctors` Collection Schema
```json
{
  "_id": "ObjectId('65f1234567890abcdef67890')",
  "userId": "65f1234567890abcdef12345",
  "firstName": "Sanjeev",
  "lastName": "Kapoor",
  "phone": "+91 9876543210",
  "email": "dr.sanjeev@clinic.com",
  "website": "https://drsanjeev.com",
  "address": "MG Road, Suite 404, Prayagraj, UP",
  "specialization": "Cardiologist",
  "experience": "8 years",
  "feesPerCunsultation": 600.0,
  "timings": ["09:00", "17:00"],
  "status": "approved",
  "createdAt": "2026-10-12T06:00:00Z",
  "updatedAt": "2026-10-12T06:30:00Z"
}
```

#### 3. `appointments` Collection Schema
```json
{
  "_id": "ObjectId('65f1234567890abcdef99999')",
  "userId": "65f1234567890abcdef12345",
  "doctorId": "65f1234567890abcdef67890",
  "date": "28-12-2026",
  "time": "10:30",
  "status": "booked",
  "doctorInfo": {
    "_id": "65f1234567890abcdef67890",
    "firstName": "Sanjeev",
    "lastName": "Kapoor",
    "phone": "+91 9876543210",
    "specialization": "Cardiologist",
    "address": "MG Road, Suite 404, Prayagraj, UP",
    "feesPerCunsultation": 600.0
  },
  "userInfo": {
    "_id": "65f1234567890abcdef12345",
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "createdAt": "2026-10-12T07:30:00Z",
  "updatedAt": "2026-10-12T07:30:00Z"
}
```

#### 4. `notifications` Collection Schema
```json
{
  "_id": "ObjectId('65f1234567890abcdef88888')",
  "userId": "65f1234567890abcdef12345",
  "type": "appointment-confirmed",
  "message": "Your appointment with Dr. Sanjeev Kapoor is confirmed!",
  "onClickPath": "/appointments",
  "data": {
    "appointmentId": "65f1234567890abcdef99999"
  },
  "read": false,
  "createdAt": "2026-10-12T07:30:00Z"
}
```

#### 5. `hospitals` Collection Schema
```json
{
  "_id": "ObjectId('65f1234567890abcdef77777')",
  "name": "Apex Heart & Multispecialty Hospital",
  "address": "Civil Lines, Prayagraj, UP 211001",
  "description": "Leading tertiary healthcare center specializing in cardiac care and emergency trauma.",
  "services": ["Emergency 24/7", "Cardiology", "ICU", "Neurology", "Pediatrics"],
  "contact": "+91 532 2400111",
  "latitude": 25.4358,
  "longitude": 81.8463,
  "createdBy": "65f1234567890abcdef00000",
  "createdAt": "2026-10-12T05:00:00Z",
  "updatedAt": "2026-10-12T05:00:00Z"
}
```

---

### 11.2 Database Indexing Catalog

| Collection | Index Name | Key Fields | Direction | Constraints & Filter Expression | Technical Justification |
|---|---|---|---|---|---|
| `users` | `email_1` | `email` | ASC (1) | `unique=True` | Enforces email uniqueness globally and accelerates login lookup to O(log N). |
| `users` | `isAdmin_1` | `isAdmin` | ASC (1) | Standard | Accelerates bootstrap admin verification and admin role queries. |
| `users` | `isDoctor_1` | `isDoctor` | ASC (1) | Standard | Filters users elevated to doctor status. |
| `doctors` | `userId_1` | `userId` | ASC (1) | Standard | Fast lookups linking doctor records to user identity. |
| `doctors` | `status_1` | `status` | ASC (1) | Standard | Powers directory queries filtering exclusively for `status == "approved"`. |
| `doctors` | `specialization_1` | `specialization`| ASC (1) | Standard | Enables fast specialist filtering across large practitioner catalogs. |
| `appointments`| `userId_1` | `userId` | ASC (1) | Standard | Accelerates patient appointment history queries (`/user-appointments`). |
| `appointments`| `doctorId_1_date_1` | `doctorId`, `date` | ASC (1), ASC (1) | Standard | Optimizes doctor daily schedule lookups. |
| `appointments`| `idx_appointments_double_booking_prevention` | `doctorId`, `date`, `time` | ASC, ASC, ASC | **`unique=True`**<br>`partialFilterExpression: {"status": "booked"}` | **Atomic Double-Booking Guard:** Enforces unique active booking per slot. Does not block rebooking if status is `cancelled`. |
| `notifications` | `userId_1_createdAt_1` | `userId`, `createdAt` | ASC (1), ASC (1) | Standard | Chronological retrieval of user in-app notifications. |
| `notifications` | `read_1` | `read` | ASC (1) | Standard | Accelerates bulk queries marking notifications as read. |
| `hospitals` | `name_1` | `name` | ASC (1) | Standard | Fast alphabetical indexing of healthcare facilities. |

---

### 11.3 High-Availability Connection Fallback & TLS Verification

```text
               ┌─────────────────────────────────────┐
               │  connect_to_mongo() Initialization  │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                [ Attempt MongoDB Atlas Connection ]
                (minPoolSize=10, maxPoolSize=50, certifi TLS)
                                  │
                    ┌─────────────┴─────────────┐
                    ▼ Success                   ▼ Failed (Timeout / Dynamic IP)
         ┌──────────────────────┐    ┌───────────────────────────────────┐
         │ Connected to Atlas!  │    │ Fallback: Connect to Local Mongo  │
         │ (Production Cluster) │    │   mongodb://localhost:27017       │
         └──────────┬───────────┘    └─────────────────┬─────────────────┘
                    │                                  ▼ Success
                    │                       ┌──────────────────────┐
                    │                       │ Connected to Local!  │
                    │                       └──────────┬───────────┘
                    └──────────────────┬───────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │ 1. init_indexes()             │
                       │ 2. bootstrap_admin() Upsert   │
                       └───────────────────────────────┘
```

1. **Connection Pool Management:** Motor client is configured with `minPoolSize=10` and `maxPoolSize=50` to maintain hot connections and eliminate TCP handshake latency.
2. **TLS Certificate Pinning:** When connecting to `mongodb+srv://` (MongoDB Atlas), the driver imports `certifi.where()` to supply trusted CA certificates, preventing SSL verification errors on Windows and minimal Docker containers.
3. **Resilient Local Fallback:** If MongoDB Atlas is temporarily unreachable (e.g., dynamic IP change, ISP routing issue, offline local development), the system automatically attempts connection to `mongodb://localhost:27017` with zero downtime.

---

## 12. Asynchronous Architecture, Caching & Messaging Systems

### 12.1 Redis In-Memory Caching (`backend/app/cache.py`)
- **Key Naming Conventions:**
  - `healthease:doctors:approved`: Serialized JSON array of all approved doctor profiles.
  - `healthease:hospitals:all`: Serialized JSON array of all healthcare center listings.
  - `healthease:doctor:{doctorId}`: Individual doctor detail cache.
- **TTL Configuration:** 300 seconds (5 minutes) default expiration.
- **Cache Invalidation Hooks:**
  - `cache.invalidate_doctors()` is invoked immediately when:
    - An admin approves or rejects a doctor application.
    - A doctor updates their consultation timings or fees.
    - A doctor account is blocked or deleted.
  - `cache.invalidate_hospitals()` is invoked when a doctor or admin creates or edits a hospital.
- **Circuit Breaker:** If Redis is offline or disabled via `REDIS_ENABLED=false`, the client logs a warning and routes queries transparently to MongoDB.

### 12.2 Distributed Rate Limiter (`backend/app/rate_limiter.py`)
- **Atomic Operations:** Uses Redis asynchronous pipelines executing `INCR` followed by `TTL`. If `TTL == -1`, it sets `EXPIRE window_seconds`.
- **Policy Matrix:**
  - `login`: 10 requests / 60 seconds per IP.
  - `register`: 5 requests / 60 seconds per IP.
  - `booking`: 10 requests / 60 seconds per IP.
  - `chatbot`: 20 requests / 60 seconds per IP.
- **In-Memory Fallback:** If Redis is unavailable, rate limiting automatically falls back to an in-memory sliding dictionary storing `(count, reset_timestamp)` per IP.

### 12.3 RabbitMQ Message Broker & Decoupled Daemon (`backend/app/queue.py`, `backend/worker.py`)
- **Decoupled Architecture:** HTTP request handlers do not perform blocking writes for auxiliary notifications.
- **Message Publishing:**
  - Durable queue: `healthease_notifications`.
  - Persistent delivery mode: `delivery_mode=2`.
  - JSON payload containing `event_type`, `recipient_user_id`, `message`, `on_click_path`, `metadata`, and UTC `timestamp`.
- **Worker Daemon (`backend/worker.py`):**
  - Runs independently via `python backend/worker.py` or as a container service.
  - Configured with `basic_qos(prefetch_count=1)` to ensure even task distribution.
  - Uses manual acknowledgments (`basic_ack` on success, `basic_nack(requeue=True)` on failure).
  - Listens for `SIGINT` and `SIGTERM` signals for graceful drain-and-stop shutdown.
- **Offline Broker Circuit Breaker:** In `queue.py`, if RabbitMQ encounters a connection error, `_broker_last_failure_time` records the timestamp. For the next 60 seconds (`BROKER_RETRY_INTERVAL`), slow connection attempts are bypassed, and notifications are immediately persisted directly to MongoDB via `persist_notification_direct()`. This guarantees user HTTP requests are never delayed by broker downtime.

---

## 13. Medical AI Assistant "Dr. AI" Deep Technical Blueprint

### 13.1 Conversational Triage Architecture (`backend/app/routes/chatbot_routes.py`)
- **Direct Async HTTP Client:** Interacts with Google's Generative Language REST API using `httpx.AsyncClient(timeout=30.0)` instead of heavy synchronous SDKs.
- **Primary & Fallback Models:** Queries `gemini-2.5-flash` first; if unavailable, automatically fails over to `gemini-1.5-flash`.
- **Clinical System Instructions:**
  ```text
  "You are Dr. AI, a friendly human doctor. NO complex jargon, NO emojis, NO markdown. 
  Keep responses to 1-3 short sentences. STRICT RULE: You are allowed to ask a maximum of 1 or 2 
  questions TOTAL to understand the patient's symptoms. Once you have enough details, STOP asking 
  questions. Provide a clear, practical health solution, medicine suggestion, or home remedy. 
  After providing the solution, politely conclude the conversation without asking anything else. 
  Disclaimer: For severe emergencies, urge immediate visit to the nearest hospital."
  ```

### 13.2 Client-Side Voice Interface (`client/src/pages/Chatbot.js`)
- **Speech Recognition (STT):** Integrates browser native `webkitSpeechRecognition` or `SpeechRecognition` in continuous mode (`continuous = true`).
- **Silence Debounce Detection:** Utilizes a 1000ms timer debounce on incoming speech chunks (`transcriptRef.current`). When the patient finishes speaking for 1 second, recognition automatically stops, formats the transcript, appends it to the chat feed, and dispatches the query to the backend.
- **Speech Synthesis Engine (TTS):**
  - Converts Dr. AI's response to audio via `SpeechSynthesisUtterance`.
  - Cleans input text using regex `replace(/[^a-zA-Z0-9.,?' ]/g, '')` to eliminate punctuation pronunciation.
  - Sets pitch to 1.05 and rate to 1.0 for warm, natural cadence.
  - Automatically iterates available browser voices to select optimal high-clarity female voices:
    `["Aria", "Samantha", "Google UK English Female", "Microsoft Zira", "Jenny"]`.
- **Sliding History Window:** The frontend retains the last 10 conversational exchanges (`chatHistoryRef.current.slice(-10)`) to maintain conversational context while preventing payload bloat.

---

## 14. Frontend Architecture, Component Hierarchy & State Management

### 14.1 Application State & Routing Architecture
- **Framework:** React 19 single-page application built on functional components with hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
- **Global Auth Context (`client/src/context/AuthContext.js`):**
  - Holds `user` profile state, `loading` indicator, and authentication methods (`login`, `logout`, `refreshUser`).
  - Automatically executes `refreshUser()` on initial application mount using stored JWTs.
- **Declarative Route Guards (`client/src/App.js`):**
  - `PublicRoute.js`: Wraps `/login`, `/register`, and `/`. If an authenticated session exists, redirects immediately to `/dashboard`.
  - `ProtectedRoute.js`: Wraps all protected views (`/dashboard`, `/appointments`, `/doctor-appointments`, `/hospitals`, `/notification`, `/profile`, `/chatbot`). Redirects unauthenticated sessions to `/login`.
- **Role-Adaptive Sidebar Navigation (`client/src/Data/data.js`):**
  - **Patient Menu:** Home (`/dashboard`), Hospitals & Maps (`/hospitals`), My Appointments (`/appointments`), Apply as Doctor (`/apply-doctor`), AI Doctor (`/chatbot`), My Profile (`/profile`).
  - **Doctor Menu:** Home (`/dashboard`), Hospitals & Maps (`/hospitals`), Manage Appointments (`/doctor-appointments`), AI Doctor (`/chatbot`), My Profile (`/doctor/profile`).
  - **Admin Menu:** Home (`/dashboard`), Hospitals & Maps (`/hospitals`), Manage Doctors (`/admin/doctors`), Manage Users (`/admin/users`).

### 14.2 Component Breakdown
- `Layout.js`: Global dashboard wrapper rendering the responsive sidebar, brand header, interactive notification bell with badge counter, and user profile trigger.
- `DoctorList.js`: Reusable practitioner card rendering specialization, experience, fees, formatted hours, and direct booking triggers.
- `Spinner.js`: Loading animation component used during async transitions.
- `BookingPage.js`: Dual-column booking portal featuring appointment slot pickers on the left and an embedded Google Maps clinic locator on the right.
- `HospitalPage.js`: Healthcare directory with service tags, an "Add Hospital" modal for doctors/admins, and a location modal with Google Maps.
- `Chatbot.js`: Medical assistant chat feed with text input, microphone toggle, listening indicators, and voice synthesis.
- `Appointments.js`: Patient appointment management table with slot cancellation modal.
- `DoctorAppointments.js`: Doctor agenda table with appointment approval and rejection controls.
- `admin/Doctors.js`: Credential review table with approve/reject actions.
- `admin/Users.js`: User governance table with account blocking triggers.
- `UserProfile.js` & `Profile.js`: Form interfaces for patient and doctor profile management.

---

## 15. DevOps, Containerization & Infrastructure Specification

### 15.1 Multi-Container Docker Topology (`docker-compose.yml`)

The multi-container specification defines six orchestrated services in an isolated virtual network:

```yaml
version: '3.8'

services:
  # 1. Redis Cache & Distributed Rate Limiter
  redis:
    image: redis:7-alpine
    container_name: healthease-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. RabbitMQ Message Broker with Management UI
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: healthease-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"     # AMQP protocol
      - "15672:15672"   # Web Management Console
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 10s
      retries: 5

  # 3. FastAPI Application Instance #1
  backend_1:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: healthease-backend-1
    restart: unless-stopped
    ports:
      - "8001:8000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB=${MONGODB_DB:-HealthEase}
      - JWT_SECRET=${JWT_SECRET}
      - ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
      - FRONTEND_ORIGIN=${FRONTEND_ORIGIN}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  # 4. FastAPI Application Instance #2 (Load Balanced Replica)
  backend_2:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: healthease-backend-2
    restart: unless-stopped
    ports:
      - "8002:8000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB=${MONGODB_DB:-HealthEase}
      - JWT_SECRET=${JWT_SECRET}
      - ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}
      - REDIS_URL=redis://redis:6379/0
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
      - FRONTEND_ORIGIN=${FRONTEND_ORIGIN}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  # 5. RabbitMQ Notification Background Worker Daemon
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: healthease-worker
    restart: unless-stopped
    command: python worker.py
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB=${MONGODB_DB:-HealthEase}
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
      - RABBITMQ_QUEUE=healthease_notifications
    depends_on:
      rabbitmq:
        condition: service_healthy

  # 6. Nginx Layer 7 Reverse Proxy & Load Balancer
  nginx_proxy:
    image: nginx:alpine
    container_name: healthease-nginx
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend_1
      - backend_2

volumes:
  redis_data:
  rabbitmq_data:
```

---

### 15.2 Nginx Reverse Proxy & Load Balancer Configuration (`nginx/nginx.conf`)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream healthease_backend {
        server backend_1:8000 max_fails=3 fail_timeout=10s;
        server backend_2:8000 max_fails=3 fail_timeout=10s;
    }

    server {
        listen 80;
        server_name localhost;
        client_max_body_size 10M;

        location / {
            proxy_pass http://healthease_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_http_version 1.1;
            proxy_set_header Connection "";

            proxy_connect_timeout 5s;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        location /lb-health {
            access_log off;
            return 200 '{"status":"UP","balancer":"nginx","cluster":"healthease_backend"}';
            add_header Content-Type application/json;
        }
    }
}
```

---

### 15.3 Complete Environment Variables Reference (`.env`)

| Variable Name | Required | Default Value | Description |
|---|---|---|---|
| `PROJECT_NAME` | No | `HealthEase` | Application branding identifier used in OpenAPI docs and health probes. |
| `API_V1_PREFIX` | No | `/api/v1` | URL path prefix for all version 1 REST routes. |
| `ENVIRONMENT` | No | `development` | Deployment environment (`development`, `staging`, `production`). In development, CORS defaults to allow all. |
| `PORT` | No | `8000` | Port for the Uvicorn ASGI server to listen on. |
| `FRONTEND_ORIGIN` | Yes | `http://localhost:3000,http://localhost:5173` | Comma-separated list of permitted CORS frontend client origins. |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017` | MongoDB connection URI. Supports MongoDB Atlas `mongodb+srv://` and local URIs. |
| `MONGODB_DB` | No | `HealthEase` | Target MongoDB database name. |
| `JWT_SECRET` | Yes | `xyz_default_jwt_secret...` | Cryptographic secret key used to sign and verify HMAC-SHA256 JWT tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` (24 Hours) | Lifespan of issued JWT access tokens before re-login is required. |
| `ALGORITHM` | No | `HS256` | JWT signature algorithm. |
| `ADMIN_NAME` | No | `HealthEase Admin` | Full name assigned to the bootstrapped administrator account. |
| `ADMIN_EMAIL` | Yes | `admin@healthease.com` | Email address for the bootstrapped administrator account. |
| `ADMIN_PASSWORD` | Yes | `xyz_admin_secure_password_123` | Initial password for the bootstrapped administrator account. |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis connection URL. Supports standard `redis://` and SSL `rediss://` (Upstash). |
| `REDIS_ENABLED` | No | `true` | Boolean flag enabling or disabling Redis caching and rate limiting. |
| `CACHE_TTL_SECONDS` | No | `300` | Expiration TTL for cached doctor and hospital listings. |
| `RABBITMQ_URL` | Yes | `amqp://guest:guest@localhost:5672/` | AMQP protocol URL. Supports local and cloud brokers (CloudAMQP `amqps://`). |
| `RABBITMQ_QUEUE` | No | `healthease_notifications` | Name of the durable AMQP queue for notification events. |
| `GEMINI_API_KEY` | Optional | `""` | Google AI Studio API key for powering the Dr. AI conversational assistant. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model identifier used for medical triage. |

---

## 16. Data Migration & Operational Utilities (`scripts/migrate_to_atlas.py`)

HealthEase provides a production-grade data migration utility for migrating collections from local MongoDB instances to MongoDB Atlas.

### Features
1. **ObjectId Preservation:** Preserves all existing `_id` ObjectIds and relational linkages across `users`, `doctors`, `appointments`, and `hospitals`.
2. **Safe Dry-Run Mode:** The `--dry-run` flag inspects source documents, verifies schemas, and outputs a complete preview report without executing any writes to the target database.
3. **Idempotent Bulk Upserts:** Uses `ReplaceOne(filter={"_id": doc["_id"]}, replacement=doc, upsert=True)` bulk write operations, allowing safe restarts without duplicating records.
4. **Target Index Building:** Automatically creates all production indexes on the target MongoDB Atlas cluster upon migration completion.

### Command-Line Usage

```bash
# 1. Preview source database counts and simulate migration (Dry Run):
python scripts/migrate_to_atlas.py --dry-run

# 2. Execute live migration from local MongoDB to MongoDB Atlas:
python scripts/migrate_to_atlas.py   --source-uri "mongodb://localhost:27017"   --source-db "HealthEase"   --target-uri "mongodb+srv://user:password@cluster0.xyz.mongodb.net/?retryWrites=true&w=majority"   --target-db "HealthEase"
```

---

## 17. Automated Testing Suite Reference

### 17.1 Backend Integration Suite (`tests/test_backend.py`)

The automated test suite runs via `pytest` and `pytest-asyncio`, utilizing FastAPI's `TestClient` to execute end-to-end tests across all backend subsystems:

```bash
# Run complete backend integration test suite:
pytest tests/test_backend.py -v
```

#### Test Inventory:
1. `test_liveness_health_check`: Pings `/health`, verifies HTTP 200, checks `"status": "healthy"`, and validates ISO UTC timestamp presence.
2. `test_readiness_probe`: Pings `/ready`, validates dependencies dictionary reporting MongoDB and Redis connectivity states.
3. `test_patient_registration_and_login`: Executes complete registration with unique UUID credentials, confirms duplicate rejection, executes login, extracts JWT, and verifies Bearer token access on `/api/v1/user/getUserData`.
4. `test_login_invalid_password`: Verifies that invalid credentials correctly fail authentication with friendly error responses.
5. `test_rbac_patient_forbidden_from_admin`: Validates role-based authorization guards by ensuring standard patient JWT tokens are rejected with HTTP 403 Forbidden when attempting to access `/api/v1/admin/getAllUsers`.
6. `test_doctor_application_workflow`: Registers a new applicant, submits clinical qualifications at `/api/v1/user/apply-doctor`, and validates successful creation in `pending` status.
7. `test_appointment_booking_and_double_booking_prevention`: **Critical Invariant Test:**
   - Books an available slot for a verified doctor.
   - Attempts an identical simultaneous booking on the same slot -> **must fail with conflict**.
   - Cancels the booking via `/api/v1/user/cancel-appointment`.
   - Re-checks availability via `/api/v1/user/booking-availbility` -> **confirms slot is freed and reusable**.
8. `test_hospital_directory_and_access`: Verifies directory access for all authenticated users while confirming that patients are blocked (HTTP 403) from creating hospital listings.
9. `test_notifications_lifecycle`: Validates batch notification operations (`/get-all-notification` and `/delete-all-notification`).
10. `test_chatbot_endpoint`: Tests the conversational AI proxy endpoint `/api/v1/chatbot/chat` and confirms rate-limiting safeguards.

### 17.2 Frontend Unit Testing (`client/src/App.test.js`)

Unit testing for the React application is executed via **Jest** and **React Testing Library**:

```bash
cd client
npm test -- --watchAll=false
```

---

## 18. Step-by-Step Local Development & Production Deployment Guide

### Option A: Bare-Metal Local Development

#### Prerequisites:
- Python 3.10+
- Node.js 18+ and npm
- Running MongoDB instance (Local on `mongodb://localhost:27017` or Atlas cloud URI)
- (Optional) Running Redis instance on `localhost:6379`
- (Optional) Running RabbitMQ broker on `localhost:5672`

#### 1. Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is now running at `http://localhost:8000`. OpenAPI documentation is available at `http://localhost:8000/docs`.

#### 2. Background Worker Setup (Separate Terminal):
```bash
cd backend
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

python worker.py
```

#### 3. Frontend Setup (Separate Terminal):
```bash
cd client

# Install dependencies
npm install

# Start React development server
npm start
```
The frontend is now accessible at `http://localhost:3000`.

---

### Option B: Docker Compose Multi-Container Deployment

Run the complete 6-service infrastructure (Nginx, 2x FastAPI, Redis, RabbitMQ, Worker) with a single command:

```bash
# Build and launch all services in detached mode
docker-compose up -d --build

# Inspect running container status
docker-compose ps

# View unified application logs
docker-compose logs -f

# Verify Nginx load balancer health
curl http://localhost:8080/lb-health

# Verify API health through load balancer
curl http://localhost:8080/health
```

Access Points:
- Public Load-Balanced Application: `http://localhost:8080`
- FastAPI Instance 1 Direct: `http://localhost:8001/docs`
- FastAPI Instance 2 Direct: `http://localhost:8002/docs`
- RabbitMQ Web Management Console: `http://localhost:15672` (Username: `guest`, Password: `guest`)
- Redis: `localhost:6379`

---

### Option C: Production Cloud Deployment

1. **Database:** Deploy a free M0 cluster on **MongoDB Atlas**. Whitelist your production server IP addresses (or `0.0.0.0/0` with strong authentication) and obtain your `mongodb+srv://` connection URI.
2. **Caching:** Create a free serverless Redis database on **Upstash Redis** and set `REDIS_URL="rediss://..."`.
3. **Messaging:** Provision a free instance on **CloudAMQP** and set `RABBITMQ_URL="amqps://..."`.
4. **Backend (FastAPI):** Deploy to **Render** or **Google Cloud Run** using `backend/Dockerfile` or native Python environment (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Configure environment variables from your `.env`.
5. **Background Worker:** Deploy a separate background worker service on **Render** executing `python worker.py`.
6. **Frontend (React):** Deploy to **Vercel**, **Netlify**, or **Cloudflare Pages**. Set environment variable `REACT_APP_API_URL` pointing to your deployed backend domain.

---

### Troubleshooting & Common Issues

| Issue / Error | Root Cause | Solution |
|---|---|---|
| `ServerSelectionTimeoutError` / MongoDB connection fails | MongoDB Atlas dynamic IP not whitelisted or SSL certificate store issue. | Add your current IP in MongoDB Atlas Network Access (`0.0.0.0/0` for development). The application includes `certifi` CA handling and automatically falls back to local MongoDB (`mongodb://localhost:27017`). |
| `AMQPConnectionError` on startup | RabbitMQ broker is still starting or unreachable. | The backend includes an automatic circuit breaker that switches to direct MongoDB persistence after connection failure, ensuring no user requests are dropped. Verify RabbitMQ is running on port 5672. |
| `HTTP 429 Too Many Requests` | Exceeded rate limit window on login, register, booking, or chatbot. | Wait 60 seconds for the fixed window counter to reset. The response includes a `Retry-After` header indicating seconds remaining. |
| `Slot Conflict` on appointment booking | Another user reserved the identical doctor, date, and time slot. | Choose a different consultation time. The database partial unique index prevents double bookings by design. |
| Gemini Chatbot returns fallback message | `GEMINI_API_KEY` is not configured or rate limit was reached. | Add your Gemini API key from Google AI Studio to `.env` (`GEMINI_API_KEY=your_key_here`). The backend gracefully falls back to friendly error messages without crashing. |
| Nginx returns `502 Bad Gateway` | Backend container instances are still initializing. | Check container health with `docker-compose ps`. Nginx will automatically route traffic once `backend_1` and `backend_2` pass readiness checks. |
