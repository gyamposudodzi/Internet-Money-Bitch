from pydantic import BaseModel


class CreateDownloadSessionRequest(BaseModel):
    content_file_id: str
    consume_points: bool = False


class DownloadSessionResponse(BaseModel):
    download_session_id: str
    session_token: str
    ad_required: bool
    points_cost: int
    telegram_deep_link: str | None = None
    expires_at: str
