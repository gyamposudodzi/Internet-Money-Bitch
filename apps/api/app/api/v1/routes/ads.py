from fastapi import APIRouter

from app.schemas.responses import api_response

router = APIRouter()


@router.post("/callback/{provider}")
async def receive_ad_callback(provider: str, payload: dict):
    return api_response(
        data={
            "provider": provider,
            "accepted": True,
            "verified": False,
        },
        meta={
            "source": "placeholder",
            "received_keys": sorted(payload.keys()),
        },
    )


@router.post("/events")
async def record_ad_event(payload: dict):
    return api_response(
        data={
            "accepted": True,
            "authoritative": False,
        },
        meta={
            "source": "placeholder",
            "received_keys": sorted(payload.keys()),
        },
    )
