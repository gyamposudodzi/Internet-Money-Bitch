from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.downloads import CreateDownloadSessionRequest
from app.schemas.responses import api_response

router = APIRouter()


@router.post("")
async def create_download_session(payload: CreateDownloadSessionRequest):
    session_id = str(uuid4())
    session_token = str(uuid4())
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.download_session_ttl_minutes)

    telegram_deep_link = None
    if settings.telegram_bot_username:
        telegram_deep_link = f"https://t.me/{settings.telegram_bot_username}?start={session_token}"

    return api_response(
        data={
            "download_session_id": session_id,
            "session_token": session_token,
            "ad_required": not payload.consume_points,
            "points_cost": 0,
            "telegram_deep_link": telegram_deep_link,
            "expires_at": expires_at.isoformat(),
        },
        meta={"source": "placeholder"},
    )


@router.get("/{session_id}")
async def get_download_session(session_id: str):
    return api_response(data=None, meta={"session_id": session_id, "source": "placeholder"})


@router.post("/{session_id}/use-points")
async def use_points_for_session(session_id: str):
    return api_response(
        data={
            "download_session_id": session_id,
            "points_spent": 0,
            "ad_required": False,
        },
        meta={"source": "placeholder"},
    )


@router.post("/{session_id}/cancel")
async def cancel_download_session(session_id: str):
    return api_response(
        data={
            "download_session_id": session_id,
            "status": "cancelled",
        },
        meta={"source": "placeholder"},
    )
