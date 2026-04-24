from pydantic import BaseModel


class TelegramSessionResponse(BaseModel):
    download_session_id: str
    session_token: str
    telegram_user_id: int | None = None
    telegram_username: str | None = None
    content_file_id: str
    content_kind: str
    content_title: str
    file_label: str | None = None
    quality: str | None = None
    format: str | None = None
    ad_required: bool
    ad_completed: bool
    status: str
    expires_at: str
    telegram_deep_link: str | None = None


class TelegramWebhookResponse(BaseModel):
    accepted: bool
    command: str | None = None
    session_token: str | None = None
    status: str | None = None
    message: str | None = None
