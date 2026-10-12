import json
import logging
from typing import Optional, Any
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("healthease.cache")

KEY_APPROVED_DOCTORS = "healthease:doctors:approved"
KEY_HOSPITALS = "healthease:hospitals:all"


class RedisCache:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
        self._connected: bool = False

    async def connect(self) -> None:
        """Connect to Redis instance if enabled."""
        if not settings.REDIS_ENABLED:
            logger.info("Redis is disabled in configuration. Skipping connection.")
            return

        try:
            self.client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
            )
            # Test connectivity
            await self.client.ping()
            self._connected = True
            logger.info("Successfully connected to Redis at %s", settings.REDIS_URL)
        except Exception as exc:
            self._connected = False
            self.client = None
            logger.warning("Redis connection failed (%s). System will proceed with direct database fallback.", exc)

    async def close(self) -> None:
        """Close the Redis client."""
        if self.client is not None:
            if hasattr(self.client, "aclose"):
                await self.client.aclose()
            else:
                await self.client.close()
            self.client = None
            self._connected = False
            logger.info("Redis connection closed.")

    @property
    def is_available(self) -> bool:
        return self._connected and self.client is not None

    async def get_json(self, key: str) -> Optional[Any]:
        """Fetch and parse JSON from Redis cache."""
        if not self._connected or self.client is None:
            return None
        try:
            data = await self.client.get(key)
            if data is not None:
                logger.debug("Cache HIT for key: %s", key)
                return json.loads(data)
            logger.debug("Cache MISS for key: %s", key)
            return None
        except Exception as exc:
            logger.warning("Error reading from Redis cache (%s): %s", key, exc)
            return None

    async def set_json(self, key: str, value: Any, ttl: int = settings.CACHE_TTL_SECONDS) -> bool:
        """Serialize and store JSON in Redis cache with TTL."""
        if not self._connected or self.client is None:
            return False
        try:
            serialized = json.dumps(value)
            await self.client.set(key, serialized, ex=ttl)
            logger.debug("Cache SET for key: %s (TTL: %ds)", key, ttl)
            return True
        except Exception as exc:
            logger.warning("Error writing to Redis cache (%s): %s", key, exc)
            return False

    async def delete(self, key: str) -> bool:
        """Delete a single key from Redis."""
        if not self._connected or self.client is None:
            return False
        try:
            await self.client.delete(key)
            logger.debug("Cache DELETE for key: %s", key)
            return True
        except Exception as exc:
            logger.warning("Error deleting key from Redis (%s): %s", key, exc)
            return False

    async def invalidate_doctors(self, doctor_id: Optional[str] = None) -> None:
        """Invalidate all cached doctor directory and profile queries."""
        await self.delete(KEY_APPROVED_DOCTORS)
        if doctor_id:
            await self.delete(f"healthease:doctor:{doctor_id}")
        logger.info("Invalidated doctor cache keys.")

    async def invalidate_hospitals(self) -> None:
        """Invalidate cached hospital listings."""
        await self.delete(KEY_HOSPITALS)
        logger.info("Invalidated hospital cache keys.")


cache = RedisCache()
