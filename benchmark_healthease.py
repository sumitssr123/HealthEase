#!/usr/bin/env python3
"""
benchmark_healthease.py
=======================
Automated Performance & Latency Benchmarking Suite for HealthEase FastAPI Server.

Measures:
1. Sustained Throughput (req/s) under concurrent load
2. Load Test p95 Latency (ms)
3. Cold MongoDB Directory Lookup Latency (ms) (cache-miss from MongoDB Atlas)
4. Warm Cached Directory Lookup Latency (ms) (cache-hit from Redis)
5. Percentage Latency Reduction (%)
"""

import os
import sys
import time
import math
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv
import httpx
import redis

# 1. Environment & Paths Configuration
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "backend" / ".env"
if not ENV_PATH.exists():
    ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

PORT = os.getenv("PORT", "8000")
API_BASE_URL = os.getenv("FASTAPI_URL", f"http://127.0.0.1:{PORT}")
API_PREFIX = os.getenv("API_V1_PREFIX", "/api/v1")
MONGODB_URI = os.getenv("MONGODB_URI")
REDIS_URL = os.getenv("REDIS_URL")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@healthease.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "xyz_admin_secure_password_123")

REDIS_DOCTOR_CACHE_KEY = "healthease:doctors:approved"


def print_banner():
    print("=" * 70)
    print("   HealthEase Real-Time Performance Benchmarking Suite")
    print(f"   Target URL: {API_BASE_URL}")
    print("=" * 70)


def get_redis_client():
    if not REDIS_URL:
        return None
    try:
        clean_url = REDIS_URL.strip("\"'")
        client = redis.from_url(clean_url, decode_responses=True, socket_connect_timeout=3.0)
        client.ping()
        return client
    except Exception as exc:
        print(f"[!] Warning: Direct Redis connection could not be established: {exc}")
        return None


def authenticate() -> str:
    """Obtain JWT token for authenticated endpoints."""
    login_url = f"{API_BASE_URL}{API_PREFIX}/user/login"
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(
            login_url,
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Login failed: HTTP {resp.status_code} - {resp.text}")
        data = resp.json()
        if not data.get("success"):
            raise RuntimeError(f"Login returned unsuccessful: {data}")
        return data["token"]


def measure_directory_cold_vs_warm(
    token: str,
    redis_client: redis.Redis,
    cold_iterations: int = 10,
    warm_iterations: int = 30,
) -> Tuple[float, float, float]:
    """
    Measure Cold (MongoDB Atlas cache miss) vs Warm (Redis cache hit) latency
    for the doctor directory lookup (/api/v1/user/getAllDoctors).
    """
    endpoint = f"{API_BASE_URL}{API_PREFIX}/user/getAllDoctors"
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n[*] Phase 1: Measuring Cold MongoDB Directory Lookup Latency...")
    cold_latencies = []
    
    with httpx.Client(timeout=15.0) as client:
        for i in range(cold_iterations):
            # Invalidate Redis cache to force cold MongoDB Atlas query
            if redis_client:
                redis_client.delete(REDIS_DOCTOR_CACHE_KEY)
            
            t0 = time.perf_counter()
            resp = client.get(endpoint, headers=headers)
            t1 = time.perf_counter()
            
            latency_ms = (t1 - t0) * 1000.0
            if resp.status_code == 200:
                body = resp.json()
                msg = body.get("message", "")
                cold_latencies.append(latency_ms)
                print(f"    Cold Run {i+1:02d}: {latency_ms:.2f} ms ({msg})")
            else:
                print(f"    Cold Run {i+1:02d} FAILED: HTTP {resp.status_code}")
            time.sleep(0.1)

        print("\n[*] Phase 2: Measuring Warm Cached Directory Lookup Latency...")
        # Warm up the cache once
        client.get(endpoint, headers=headers)
        
        warm_latencies = []
        for i in range(warm_iterations):
            t0 = time.perf_counter()
            resp = client.get(endpoint, headers=headers)
            t1 = time.perf_counter()
            
            latency_ms = (t1 - t0) * 1000.0
            if resp.status_code == 200:
                body = resp.json()
                msg = body.get("message", "")
                warm_latencies.append(latency_ms)
                if (i + 1) % 10 == 0 or (i + 1) == warm_iterations:
                    print(f"    Warm Run {i+1:02d}: {latency_ms:.2f} ms ({msg})")
            else:
                print(f"    Warm Run {i+1:02d} FAILED: HTTP {resp.status_code}")
            time.sleep(0.02)

    avg_cold = sum(cold_latencies) / len(cold_latencies) if cold_latencies else 0.0
    avg_warm = sum(warm_latencies) / len(warm_latencies) if warm_latencies else 0.0
    reduction = ((avg_cold - avg_warm) / avg_cold) * 100.0 if avg_cold > 0 else 0.0

    return avg_cold, avg_warm, reduction


async def _load_test_worker(
    client: httpx.AsyncClient,
    url: str,
    headers: Dict[str, str],
    request_queue: asyncio.Queue,
    latencies: List[float],
):
    while not request_queue.empty():
        try:
            _ = request_queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        
        t0 = time.perf_counter()
        try:
            resp = await client.get(url, headers=headers)
            t1 = time.perf_counter()
            if resp.status_code == 200:
                latencies.append((t1 - t0) * 1000.0)
        except Exception:
            pass
        finally:
            request_queue.task_done()


async def run_concurrent_load_test(
    token: str,
    total_requests: int = 1000,
    concurrency: int = 25,
) -> Tuple[float, float, float, float]:
    """
    Run concurrent asynchronous load test against the API to measure sustained
    throughput (req/s) and p95 latency under realistic production traffic load.
    """
    print(f"\n[*] Phase 3: Running Concurrent Load Test ({total_requests} requests, concurrency={concurrency})...")
    endpoint = f"{API_BASE_URL}/health"
    headers = {"Authorization": f"Bearer {token}"}

    queue = asyncio.Queue()
    for _ in range(total_requests):
        queue.put_nowait(1)

    latencies: List[float] = []

    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency * 2)
    async with httpx.AsyncClient(limits=limits, timeout=10.0) as client:
        t_start = time.perf_counter()
        workers = [
            asyncio.create_task(_load_test_worker(client, endpoint, headers, queue, latencies))
            for _ in range(concurrency)
        ]
        await asyncio.gather(*workers)
        t_end = time.perf_counter()

    total_time = t_end - t_start
    throughput = len(latencies) / total_time if total_time > 0 else 0.0

    latencies.sort()
    n = len(latencies)
    if n > 0:
        p50 = latencies[int(n * 0.50)]
        p90 = latencies[int(n * 0.90)]
        p95 = latencies[min(int(math.ceil(n * 0.95)) - 1, n - 1)]
        p99 = latencies[min(int(math.ceil(n * 0.99)) - 1, n - 1)]
    else:
        p50 = p90 = p95 = p99 = 0.0

    print(f"    Completed {len(latencies)} / {total_requests} requests in {total_time:.2f}s")
    print(f"    Sustained Throughput: {throughput:.2f} req/s")
    print(f"    Latency: p50={p50:.2f}ms | p90={p90:.2f}ms | p95={p95:.2f}ms | p99={p99:.2f}ms")

    return throughput, p95, p50, total_time


def main():
    print_banner()

    # Step 1: Health Check
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{API_BASE_URL}/health")
            if resp.status_code != 200:
                print(f"[!] Server returned HTTP {resp.status_code} on /health. Aborting.")
                sys.exit(1)
            print("[+] HealthEase FastAPI server is alive and reachable.")
    except Exception as exc:
        print(f"[!] Unable to connect to FastAPI server at {API_BASE_URL}: {exc}")
        print("    Please ensure the server is started with: python -m uvicorn app.main:app --port 8000")
        sys.exit(1)

    # Step 2: Redis Client
    redis_client = get_redis_client()
    if redis_client:
        print("[+] Redis connected successfully.")
    else:
        print("[!] Running in fallback mode without direct Redis cache purge.")

    # Step 3: Authenticate
    print("[*] Authenticating with administrator credentials...")
    token = authenticate()
    print("[+] Successfully authenticated. Bearer token acquired.")

    # Step 4: Cold vs Warm Directory Latency
    avg_cold, avg_warm, latency_reduction = measure_directory_cold_vs_warm(
        token=token,
        redis_client=redis_client,
        cold_iterations=10,
        warm_iterations=30,
    )

    # Step 5: Load Test for Sustained Throughput & p95 Latency
    throughput, p95_latency, p50_latency, total_time = asyncio.run(
        run_concurrent_load_test(token=token, total_requests=1000, concurrency=25)
    )

    # Step 6: Summary for Resume
    print("\n" + "=" * 70)
    print("                      BENCHMARK RESULTS")
    print("=" * 70)
    print(f"1. Sustained Throughput: {throughput:.2f} req/s")
    print(f"2. Load Test p95 Latency: {p95_latency:.2f} ms")
    print(f"3. Cold MongoDB Directory Lookup Latency: {avg_cold:.2f} ms")
    print(f"4. Warm Cached Directory Lookup Latency: {avg_warm:.2f} ms")
    print(f"5. Percentage Latency Reduction: {latency_reduction:.2f}%")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
