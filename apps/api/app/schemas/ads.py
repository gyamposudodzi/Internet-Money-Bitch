from pydantic import BaseModel


class AdCallbackResponse(BaseModel):
    provider: str
    accepted: bool
    verified: bool
    duplicate: bool = False
    download_session_id: str | None = None
    session_token: str | None = None
    status: str | None = None
    reward_points: int = 0


class AdEventResponse(BaseModel):
    accepted: bool
    authoritative: bool
    verified: bool = False
    provider: str | None = None
    session_token: str | None = None
