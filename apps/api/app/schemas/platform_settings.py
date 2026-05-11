from pydantic import BaseModel, Field


class SiteConfigPublic(BaseModel):
    """Returned to the public web app (no secrets)."""

    telegram_bot_username: str = ""
    public_site_url: str = ""
    rewarded_ad_duration_seconds: int = Field(default=5, ge=1, le=600)
    download_help_text: str = ""
    visitor_param_hint: str = ""
    telegram_demo_deep_link: str = ""


class SiteConfigAdminPatch(BaseModel):
    """Partial update from admin; omit fields you do not want to change."""

    telegram_bot_username: str | None = None
    public_site_url: str | None = None
    rewarded_ad_duration_seconds: int | None = Field(default=None, ge=1, le=600)
    download_help_text: str | None = None
    visitor_param_hint: str | None = None
    telegram_demo_deep_link: str | None = None
