from pydantic import BaseModel, Field


class ContentFileSummary(BaseModel):
    id: str
    label: str | None = None
    quality: str | None = None
    format: str | None = None
    file_size_bytes: int | None = None
    requires_ad: bool = True
    points_cost: int = 0


class MediaSummary(BaseModel):
    id: str
    title: str
    slug: str
    poster_url: str | None = None
    release_year: int | None = None
    content_type: str


class MediaDetail(MediaSummary):
    synopsis: str | None = None
    backdrop_url: str | None = None
    language: str | None = None
    files: list[ContentFileSummary] = Field(default_factory=list)


class HomeSection(BaseModel):
    key: str
    title: str
    items: list[MediaSummary] = Field(default_factory=list)
