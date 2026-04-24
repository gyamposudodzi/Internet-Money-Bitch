from fastapi import APIRouter

from app.schemas.responses import api_response

router = APIRouter()


@router.post("/webhook")
async def telegram_webhook(update: dict):
    return api_response(
        data={"accepted": True},
        meta={
            "source": "placeholder",
            "received_keys": sorted(update.keys()),
        },
    )


@router.get("/session/{token}")
async def get_telegram_session(token: str):
    return api_response(data=None, meta={"token": token, "source": "placeholder"})


@router.post("/session/{token}/complete")
async def complete_telegram_session(token: str):
    return api_response(
        data={
            "session_token": token,
            "status": "completed",
        },
        meta={"source": "placeholder"},
    )
