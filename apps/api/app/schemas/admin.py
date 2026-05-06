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


class AdminMovieCreateRequest(BaseModel):
    title: str
    slug: str
    synopsis: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    release_year: int | None = None
    duration_minutes: int | None = None
    language: str | None = None
    country: str | None = None
    imdb_rating: float | None = None
    publication_status: str = "draft"
    featured_rank: int | None = None


class AdminAudioCreateRequest(BaseModel):
    title: str
    slug: str
    artist: str | None = None
    album: str | None = None
    synopsis: str | None = None
    cover_url: str | None = None
    language: str | None = None
    duration_seconds: int | None = None
    publication_status: str = "draft"
    featured_rank: int | None = None


class AdminContentFileCreateRequest(BaseModel):
    content_kind: str
    content_id: str
    label: str | None = None
    quality: str | None = None
    format: str | None = None
    file_size_bytes: int | None = None
    storage_provider: str
    storage_bucket: str | None = None
    storage_key: str
    mime_type: str | None = None
    delivery_mode: str = "telegram_bot"
    telegram_channel_id: int | None = None
    telegram_message_id: int | None = None
    requires_ad: bool = True
    points_cost: int = 0
    is_active: bool = True


class AdminMovieSummary(BaseModel):
    id: str
    title: str
    slug: str
    release_year: int | None = None
    language: str | None = None
    publication_status: str
    featured_rank: int | None = None


class AdminAudioSummary(BaseModel):
    id: str
    title: str
    slug: str
    artist: str | None = None
    album: str | None = None
    language: str | None = None
    publication_status: str
    featured_rank: int | None = None


class AdminContentFileSummary(BaseModel):
    id: str
    content_kind: str
    content_id: str
    label: str | None = None
    quality: str | None = None
    format: str | None = None
    storage_provider: str
    storage_key: str
    delivery_mode: str
    requires_ad: bool
    points_cost: int
    is_active: bool
