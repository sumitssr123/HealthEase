import time
import logging
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status

from app.cache import cache

logger = logging.getLogger("healthease.ratelimiter")

# In-memory fallback dictionary: {key: (count, reset_timestamp)}
_in_memory_limits: Dict[str, Tuple[int, float]] = {}


async def check_rate_limit(
    request: Request,
    key_prefix: str,
    max_requests: int,
    window_seconds: int = 60,
    identifier: str = ""
) -> None:
    """
    Enforce fixed-window rate limiting on a specific endpoint action.
    Uses Redis atomic INCR + EXPIRE if Redis is online.
    Falls back to in-memory sliding bucket if Redis is offline.
    Raises HTTPException(429) if the limit is exceeded.
    """
    # Determine client identifier (custom identifier or client IP)
    client_ip = request.client.host if request.client else "127.0.0.1"
    resolved_id = identifier if identifier else client_ip
    rate_key = f"healthease:ratelimit:{key_prefix}:{resolved_id}"

    # 1. Try Redis-backed rate limiting
    if cache.is_available and cache.client is not None:
        try:
            pipe = cache.client.pipeline()
            pipe.incr(rate_key)
            pipe.ttl(rate_key)
            results = await pipe.execute()
            
            current_count = results[0]
            ttl = results[1]

            # If key is newly created (ttl == -1), set its expiration window
            if ttl == -1:
                await cache.client.expire(rate_key, window_seconds)

            if current_count > max_requests:
                logger.warning("Rate limit exceeded for %s: %d/%d requests", rate_key, current_count, max_requests)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Allowed: {max_requests} requests per {window_seconds}s. Try again in a minute.",
                    headers={"Retry-After": str(max(ttl, 1)) if ttl > 0 else str(window_seconds)}
                )
            return
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Redis rate limit check error (%s), using in-memory fallback: %s", rate_key, exc)

    # 2. In-Memory Fallback
    now = time.time()
    count, reset_time = _in_memory_limits.get(rate_key, (0, now + window_seconds))

    if now > reset_time:
        # Window expired, reset
        count = 1
        reset_time = now + window_seconds
        _in_memory_limits[rate_key] = (count, reset_time)
    else:
        count += 1
        _in_memory_limits[rate_key] = (count, reset_time)

    if count > max_requests:
        retry_after = max(1, int(reset_time - now))
        logger.warning("In-memory rate limit exceeded for %s: %d/%d", rate_key, count, max_requests)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests allowed. Try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)}
        )
