from pydantic import BaseModel
from fastapi import APIRouter

from app.schemas.responses import api_response

router = APIRouter()


class TelegramLinkRequest(BaseModel):
    telegram_user_id: int
    telegram_username: str | None = None
    auth_payload: str | None = None


@router.post("/telegram/link")
async def link_telegram_account(payload: TelegramLinkRequest):
    return api_response(
        data={
            "linked": False,
            "telegram_user_id": payload.telegram_user_id,
        },
        meta={"source": "placeholder"},
    )
