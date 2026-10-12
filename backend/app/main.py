import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, db_state
from app.cache import cache

from app.routes.auth_routes import router as auth_router
from app.routes.doctor_routes import router as doctor_router
from app.routes.appointment_routes import router as appointment_router
from app.routes.hospital_routes import router as hospital_router
from app.routes.admin_routes import router as admin_router
from app.routes.notification_routes import router as notification_router
from app.routes.chatbot_routes import router as chatbot_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("healthease.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for clean startup and shutdown."""
    logger.info("Initializing HealthEase Backend services...")
    # 1. Connect to MongoDB and build indexes
    await connect_to_mongo()
    # 2. Connect to Redis cache & rate limiter
    await cache.connect()
    logger.info("HealthEase Backend initialization complete!")

    yield

    logger.info("Shutting down HealthEase Backend services...")
    await cache.close()
    await close_mongo_connection()
    logger.info("HealthEase Backend shutdown finished.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-performance FastAPI Backend for HealthEase Doctor Appointment Platform",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================================
# Operational Probes: Health & Readiness
# ========================================================
@app.get("/health", tags=["Operational"])
async def liveness_health_check():
    """Application Liveness Probe for load balancers and container orchestrators."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/ready", tags=["Operational"])
async def readiness_check():
    """Application Readiness Probe verifying essential dependencies."""
    deps = {
        "mongodb": "unknown",
        "redis": "connected" if cache.is_available else "offline (fallback active)",
    }

    # Verify MongoDB
    is_ready = True
    if db_state.db is not None and db_state.client is not None:
        try:
            await db_state.client.admin.command("ping")
            deps["mongodb"] = "connected"
        except Exception as exc:
            deps["mongodb"] = f"unhealthy: {exc}"
            is_ready = False
    else:
        deps["mongodb"] = "disconnected"
        is_ready = False

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "dependencies": deps,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


@app.get("/", tags=["Operational"])
async def root():
    """Root info endpoint."""
    return {
        "message": "HealthEase API is running",
        "documentation": "/docs",
        "version": "2.0.0",
    }


# ========================================================
# Register API Routers
# ========================================================
api_prefix = settings.API_V1_PREFIX  # e.g. /api/v1

app.include_router(auth_router, prefix=api_prefix)
app.include_router(doctor_router, prefix=api_prefix)
app.include_router(appointment_router, prefix=api_prefix)
app.include_router(hospital_router, prefix=api_prefix)
app.include_router(admin_router, prefix=api_prefix)
app.include_router(notification_router, prefix=api_prefix)
app.include_router(chatbot_router, prefix=api_prefix)
