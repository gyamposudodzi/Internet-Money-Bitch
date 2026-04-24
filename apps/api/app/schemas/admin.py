from pydantic import BaseModel


class AdminIdentityResponse(BaseModel):
    user_id: str
    telegram_user_id: int | None = None
    telegram_username: str | None = None
    role: str
    can_manage_content: bool
    can_manage_users: bool
    can_manage_rewards: bool
    can_view_analytics: bool


class AdminOverviewResponse(BaseModel):
    published_movies: int = 0
    published_audio: int = 0
    download_sessions: int = 0
    verified_ad_events: int = 0
    total_users: int = 0


class AdminUserSummary(BaseModel):
    user_id: str
    telegram_username: str | None = None
    role: str
    can_manage_content: bool
    can_manage_users: bool
    can_manage_rewards: bool
    can_view_analytics: bool
