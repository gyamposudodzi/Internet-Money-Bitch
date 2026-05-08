from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    identifier: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_user_id: str


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


class AdminPlatformUserSummary(BaseModel):
    user_id: str
    telegram_user_id: int | None = None
    telegram_username: str | None = None
    role: str
    points_balance: int = 0
    is_banned: bool = False
    last_seen_at: str | None = None


class AdminUserModerationRequest(BaseModel):
    is_banned: bool


class AdminPointAdjustmentRequest(BaseModel):
    amount: int
    reason: str


class AdminPointAdjustmentResponse(BaseModel):
    user: AdminPlatformUserSummary
    balance_before: int
    balance_after: int
    amount: int
    reason: str


class AdminAuditLogSummary(BaseModel):
    id: str
    actor_user_id: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    metadata: dict
    created_at: str


class AdminHomepageSectionCreateRequest(BaseModel):
    title: str
    slug: str
    sort_order: int = 0
    is_active: bool = True
    config: dict = {}


class AdminHomepageSectionUpdateRequest(BaseModel):
    title: str | None = None
    slug: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    config: dict | None = None


class AdminGenreSummary(BaseModel):
    id: str
    name: str
    slug: str


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
    genre_slugs: list[str] = []


class AdminMovieUpdateRequest(BaseModel):
    title: str | None = None
    slug: str | None = None
    synopsis: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    release_year: int | None = None
    duration_minutes: int | None = None
    language: str | None = None
    country: str | None = None
    imdb_rating: float | None = None
    publication_status: str | None = None
    featured_rank: int | None = None
    genre_slugs: list[str] | None = None


class AdminSeriesCreateRequest(BaseModel):
    title: str
    slug: str
    synopsis: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    release_year: int | None = None
    language: str | None = None
    country: str | None = None
    publication_status: str = "draft"
    featured_rank: int | None = None
    genre_slugs: list[str] = []


class AdminSeriesUpdateRequest(BaseModel):
    title: str | None = None
    slug: str | None = None
    synopsis: str | None = None
    poster_url: str | None = None
    backdrop_url: str | None = None
    release_year: int | None = None
    language: str | None = None
    country: str | None = None
    publication_status: str | None = None
    featured_rank: int | None = None
    genre_slugs: list[str] | None = None


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


class AdminAudioUpdateRequest(BaseModel):
    title: str | None = None
    slug: str | None = None
    artist: str | None = None
    album: str | None = None
    synopsis: str | None = None
    cover_url: str | None = None
    language: str | None = None
    duration_seconds: int | None = None
    publication_status: str | None = None
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


class AdminContentFileUpdateRequest(BaseModel):
    content_kind: str | None = None
    content_id: str | None = None
    label: str | None = None
    quality: str | None = None
    format: str | None = None
    file_size_bytes: int | None = None
    storage_provider: str | None = None
    storage_bucket: str | None = None
    storage_key: str | None = None
    mime_type: str | None = None
    delivery_mode: str | None = None
    telegram_channel_id: int | None = None
    telegram_message_id: int | None = None
    requires_ad: bool | None = None
    points_cost: int | None = None
    is_active: bool | None = None


class AdminMovieSummary(BaseModel):
    id: str
    title: str
    slug: str
    release_year: int | None = None
    language: str | None = None
    publication_status: str
    featured_rank: int | None = None
    genre_slugs: list[str] = []


class AdminSeriesSummary(BaseModel):
    id: str
    title: str
    slug: str
    release_year: int | None = None
    language: str | None = None
    publication_status: str
    featured_rank: int | None = None
    genre_slugs: list[str] = []


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
    assignment_state: str | None = None
    assignment_label: str | None = None
    label: str | None = None
    quality: str | None = None
    format: str | None = None
    storage_provider: str
    storage_key: str
    delivery_mode: str
    requires_ad: bool
    points_cost: int
    is_active: bool


class AdminHomepageSectionSummary(BaseModel):
    id: str
    title: str
    slug: str
    sort_order: int
    is_active: bool
    config: dict
