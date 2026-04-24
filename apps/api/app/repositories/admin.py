from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError


@dataclass(slots=True)
class AdminIdentity:
    user_id: str
    telegram_user_id: int | None
    telegram_username: str | None
    role: str
    can_manage_content: bool
    can_manage_users: bool
    can_manage_rewards: bool
    can_view_analytics: bool


class AdminRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_admin_identity(self, user_id: str) -> AdminIdentity:
        result = await self.session.execute(
            text(
                """
                select
                  u.id::text as user_id,
                  u.telegram_user_id,
                  u.telegram_username,
                  u.role::text as role,
                  coalesce(ar.can_manage_content, false) as can_manage_content,
                  coalesce(ar.can_manage_users, false) as can_manage_users,
                  coalesce(ar.can_manage_rewards, false) as can_manage_rewards,
                  coalesce(ar.can_view_analytics, false) as can_view_analytics
                from public.users u
                left join public.admin_roles ar on ar.user_id = u.id
                where u.id = :user_id::uuid
                limit 1
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="admin_user_not_found", message="Admin user not found.", status_code=404)

        identity = AdminIdentity(
            user_id=row["user_id"],
            telegram_user_id=row["telegram_user_id"],
            telegram_username=row["telegram_username"],
            role=row["role"],
            can_manage_content=bool(row["can_manage_content"]),
            can_manage_users=bool(row["can_manage_users"]),
            can_manage_rewards=bool(row["can_manage_rewards"]),
            can_view_analytics=bool(row["can_view_analytics"]),
        )
        if not self._has_any_admin_permission(identity):
            raise AppError(
                code="admin_permission_denied",
                message="This user does not have admin permissions.",
                status_code=403,
            )
        return identity

    async def get_overview(self) -> dict:
        metrics_query = text(
            """
            select
              (select count(*) from public.movies where publication_status = 'published') as published_movies,
              (select count(*) from public.audio_items where publication_status = 'published') as published_audio,
              (select count(*) from public.download_sessions) as download_sessions,
              (select count(*) from public.ad_events where verified = true) as verified_ad_events,
              (select count(*) from public.users where role = 'user') as total_users
            """
        )
        metrics_row = (await self.session.execute(metrics_query)).mappings().first()
        return dict(metrics_row) if metrics_row else {}

    async def list_admin_users(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  u.id::text as user_id,
                  u.telegram_username,
                  u.role::text as role,
                  ar.can_manage_content,
                  ar.can_manage_users,
                  ar.can_manage_rewards,
                  ar.can_view_analytics
                from public.users u
                join public.admin_roles ar on ar.user_id = u.id
                order by u.created_at asc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    @staticmethod
    def _has_any_admin_permission(identity: AdminIdentity) -> bool:
        return any(
            (
                identity.can_manage_content,
                identity.can_manage_users,
                identity.can_manage_rewards,
                identity.can_view_analytics,
            )
        )
