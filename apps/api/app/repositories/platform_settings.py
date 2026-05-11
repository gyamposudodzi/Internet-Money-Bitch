from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session

DEFAULT_PLATFORM_SETTINGS: dict[str, Any] = {
    "telegram_bot_username": "",
    "public_site_url": "",
    "rewarded_ad_duration_seconds": 5,
    "download_help_text": (
        "Open Telegram, watch the short sponsored clip (~5 seconds), then the bot sends your file."
    ),
    "visitor_param_hint": (
        "Visitor links from Telegram should include user_id or telegram_user_id in the query string."
    ),
    "telegram_demo_deep_link": "https://t.me/demo_bot?start=demo-token",
}


def merge_platform_settings(raw: dict[str, Any] | None) -> dict[str, Any]:
    merged: dict[str, Any] = {**DEFAULT_PLATFORM_SETTINGS, **(raw or {})}
    dur = merged.get("rewarded_ad_duration_seconds", DEFAULT_PLATFORM_SETTINGS["rewarded_ad_duration_seconds"])
    try:
        merged["rewarded_ad_duration_seconds"] = max(1, min(600, int(dur)))
    except (TypeError, ValueError):
        merged["rewarded_ad_duration_seconds"] = int(DEFAULT_PLATFORM_SETTINGS["rewarded_ad_duration_seconds"])
    return merged


class PlatformSettingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_settings(self) -> dict[str, Any]:
        result = await self.session.execute(
            text("select settings from public.platform_settings where id = 1 limit 1")
        )
        row = result.first()
        if not row or row[0] is None:
            return dict(DEFAULT_PLATFORM_SETTINGS)
        stored = row[0]
        if isinstance(stored, str):
            try:
                stored = json.loads(stored)
            except json.JSONDecodeError:
                stored = {}
        if not isinstance(stored, dict):
            stored = {}
        return merge_platform_settings(stored)

    async def update_settings(self, patch: dict[str, Any], actor_user_id: str) -> dict[str, Any]:
        current = await self.get_settings()
        for key, value in patch.items():
            if value is None:
                continue
            current[key] = value

        merged = merge_platform_settings(current)
        await self.session.execute(
            text(
                """
                insert into public.platform_settings (id, settings, updated_at)
                values (1, :settings::jsonb, now())
                on conflict (id) do update
                set settings = excluded.settings,
                    updated_at = now()
                """
            ),
            {"settings": json.dumps(merged)},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="platform_settings.updated",
            entity_type="platform_settings",
            entity_id=None,
            metadata={"keys": list(patch.keys())},
        )
        await self.session.commit()
        return merged

    async def _insert_audit_log(
        self,
        actor_user_id: str,
        action: str,
        entity_type: str,
        entity_id: str | None,
        metadata: dict,
    ) -> None:
        await self.session.execute(
            text(
                """
                insert into public.audit_logs (
                  id,
                  actor_user_id,
                  action,
                  entity_type,
                  entity_id,
                  metadata
                )
                values (
                  :id::uuid,
                  :actor_user_id::uuid,
                  :action,
                  :entity_type,
                  :entity_id::uuid,
                  :metadata::jsonb
                )
                """
            ),
            {
                "id": str(uuid4()),
                "actor_user_id": actor_user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "metadata": json.dumps(metadata),
            },
        )


def get_platform_settings_repository(
    session: AsyncSession = Depends(get_db_session),
) -> PlatformSettingsRepository:
    return PlatformSettingsRepository(session)
