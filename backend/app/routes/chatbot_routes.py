import os
import logging
from typing import Dict, Any, List
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Body, status

from app.config import settings
from app.dependencies import get_current_user
from app.rate_limiter import check_rate_limit

logger = logging.getLogger("healthease.chatbot_routes")
router = APIRouter(prefix="/chatbot", tags=["AI Doctor Chatbot"])

SYSTEM_INSTRUCTION = (
    "You are Dr. AI, a friendly human doctor. NO complex jargon, NO emojis, NO markdown. "
    "Keep responses to 1-3 short sentences. STRICT RULE: You are allowed to ask a maximum of 1 or 2 "
    "questions TOTAL to understand the patient's symptoms. Once you have enough details, STOP asking "
    "questions. Provide a clear, practical health solution, medicine suggestion, or home remedy. "
    "After providing the solution, politely conclude the conversation without asking anything else. "
    "Disclaimer: For severe emergencies, urge immediate visit to the nearest hospital."
)


@router.post("/chat")
async def chat_with_gemini(
    request: Request,
    body: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Medical AI Chatbot powered by Google Gemini.
    Preserves exact system instructions, model settings, and conversation logic.
    Rate limited to 20 requests per minute.
    """
    # Rate limit: 20 chatbot calls per minute
    await check_rate_limit(request, key_prefix="chatbot", max_requests=20, window_seconds=60)

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not configured in backend environment")
        msg = "Gemini API key is not configured. Please set GEMINI_API_KEY in Render environment variables."
        return {"success": False, "message": msg, "error": msg}

    chat_history = body.get("chatHistory", [])
    if not chat_history:
        msg = "Chat history cannot be empty"
        return {"success": False, "message": msg, "error": msg}

    # Format payload for Gemini API
    gemini_payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        },
        "contents": chat_history,
    }

    models_to_try = [settings.GEMINI_MODEL or "gemini-2.5-flash"]
    if "gemini-1.5-flash" not in models_to_try:
        models_to_try.append("gemini-1.5-flash")

    last_error = "Gemini API Error"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                resp = await client.post(url, json=gemini_payload)
                result = resp.json()

                if resp.status_code == 200:
                    candidates = result.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        reply_text = candidates[0]["content"]["parts"][0]["text"]
                        return {"success": True, "reply": reply_text}
                else:
                    last_error = result.get("error", {}).get("message", f"Gemini API Error ({resp.status_code})")
                    logger.warning("Gemini model %s returned (%d): %s", model_name, resp.status_code, last_error)

        error_msg = f"AI Service Error: {last_error}"
        return {"success": False, "message": error_msg, "error": error_msg}

    except httpx.TimeoutException:
        logger.error("Gemini API request timed out")
        msg = "AI service timed out. Please try again."
        return {"success": False, "message": msg, "error": msg}
    except Exception as exc:
        logger.error("Chatbot unexpected error: %s", exc)
        msg = "Internal chatbot error"
        return {"success": False, "message": msg, "error": msg}
