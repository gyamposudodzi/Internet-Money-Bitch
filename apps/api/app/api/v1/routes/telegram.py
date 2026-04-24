from fastapi import APIRouter, Depends

from app.core.database import get_db_session
from app.core.errors import AppError
from app.repositories.downloads import DownloadRepository
from app.schemas.responses import api_response
from app.schemas.telegram import TelegramSessionResponse, TelegramWebhookResponse
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def get_download_repository(session: AsyncSession = Depends(get_db_session)) -> DownloadRepository:
    return DownloadRepository(session)


@router.post("/webhook")
async def telegram_webhook(
    update: dict,
    repository: DownloadRepository = Depends(get_download_repository),
):
    message_text = (
        update.get("message", {}).get("text")
        or update.get("edited_message", {}).get("text")
        or ""
    ).strip()

    if not message_text:
        return api_response(
            data=TelegramWebhookResponse(
                accepted=True,
                message="No Telegram command found in update payload.",
            )
        )

    command, _, token = message_text.partition(" ")
    command = command.strip()
    token = token.strip()

    if command != "/start":
        return api_response(
            data=TelegramWebhookResponse(
                accepted=True,
                command=command,
                message="Unsupported Telegram command.",
            )
        )

    if not token:
        raise AppError(
            code="telegram_session_token_missing",
            message="Telegram session token is required for /start.",
            status_code=400,
        )

    session = await repository.get_session_by_token(token)
    if session is None:
        raise AppError(
            code="telegram_session_not_found",
            message="Telegram session not found.",
            status_code=404,
        )

    return api_response(
        data=TelegramWebhookResponse(
            accepted=True,
            command=command,
            session_token=token,
            status=session.status,
            message="Telegram session loaded.",
        ),
        meta={
            "content_title": session.content_title,
            "ad_required": session.ad_required,
            "ad_completed": session.ad_completed,
        },
    )


@router.get("/session/{token}")
async def get_telegram_session(
    token: str,
    repository: DownloadRepository = Depends(get_download_repository),
):
    session = await repository.get_session_by_token(token)
    if session is None:
        raise AppError(
            code="telegram_session_not_found",
            message="Telegram session not found.",
            status_code=404,
        )
    return api_response(data=TelegramSessionResponse.model_validate(session.__dict__))


@router.post("/session/{token}/complete")
async def complete_telegram_session(
    token: str,
    repository: DownloadRepository = Depends(get_download_repository),
):
    session = await repository.complete_session_by_token(token)
    if session is None:
        raise AppError(
            code="telegram_session_not_found",
            message="Telegram session not found.",
            status_code=404,
        )
    return api_response(data=TelegramSessionResponse.model_validate(session.__dict__))
