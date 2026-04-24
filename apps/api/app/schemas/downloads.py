from pydantic import BaseModel


class CreateDownloadSessionRequest(BaseModel):
    content_file_id: str
    consume_points: bool = False
    user_id: str


class DownloadSessionResponse(BaseModel):
    download_session_id: str
    session_token: str
    ad_required: bool
    points_cost: int
    points_spent: int = 0
    telegram_deep_link: str | None = None
    expires_at: str
    status: str
    content_file_id: str
