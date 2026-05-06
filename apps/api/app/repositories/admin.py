from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

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

    async def list_movies(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  title,
                  slug,
                  release_year,
                  language,
                  publication_status::text as publication_status,
                  featured_rank
                from public.movies
                order by created_at desc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def create_movie(self, payload: dict, actor_user_id: str) -> dict:
        movie_id = str(uuid4())
        await self.session.execute(
            text(
                """
                insert into public.movies (
                  id,
                  title,
                  slug,
                  synopsis,
                  poster_url,
                  backdrop_url,
                  release_year,
                  duration_minutes,
                  language,
                  country,
                  imdb_rating,
                  publication_status,
                  featured_rank,
                  published_at,
                  created_by
                )
                values (
                  :id::uuid,
                  :title,
                  :slug,
                  :synopsis,
                  :poster_url,
                  :backdrop_url,
                  :release_year,
                  :duration_minutes,
                  :language,
                  :country,
                  :imdb_rating,
                  :publication_status::public.publication_status,
                  :featured_rank,
                  case when :publication_status = 'published' then now() else null end,
                  :created_by::uuid
                )
                """
            ),
            {
                "id": movie_id,
                "created_by": actor_user_id,
                **payload,
            },
        )
        await self.session.commit()
        return {
            "id": movie_id,
            "title": payload["title"],
            "slug": payload["slug"],
            "release_year": payload.get("release_year"),
            "language": payload.get("language"),
            "publication_status": payload["publication_status"],
            "featured_rank": payload.get("featured_rank"),
        }

    async def list_audio(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  title,
                  slug,
                  artist,
                  album,
                  language,
                  publication_status::text as publication_status,
                  featured_rank
                from public.audio_items
                order by created_at desc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def create_audio(self, payload: dict, actor_user_id: str) -> dict:
        audio_id = str(uuid4())
        await self.session.execute(
            text(
                """
                insert into public.audio_items (
                  id,
                  title,
                  slug,
                  artist,
                  album,
                  synopsis,
                  cover_url,
                  language,
                  duration_seconds,
                  publication_status,
                  featured_rank,
                  published_at,
                  created_by
                )
                values (
                  :id::uuid,
                  :title,
                  :slug,
                  :artist,
                  :album,
                  :synopsis,
                  :cover_url,
                  :language,
                  :duration_seconds,
                  :publication_status::public.publication_status,
                  :featured_rank,
                  case when :publication_status = 'published' then now() else null end,
                  :created_by::uuid
                )
                """
            ),
            {
                "id": audio_id,
                "created_by": actor_user_id,
                **payload,
            },
        )
        await self.session.commit()
        return {
            "id": audio_id,
            "title": payload["title"],
            "slug": payload["slug"],
            "artist": payload.get("artist"),
            "album": payload.get("album"),
            "language": payload.get("language"),
            "publication_status": payload["publication_status"],
            "featured_rank": payload.get("featured_rank"),
        }

    async def list_content_files(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  content_kind::text as content_kind,
                  content_id::text as content_id,
                  label,
                  quality,
                  format,
                  storage_provider::text as storage_provider,
                  storage_key,
                  delivery_mode::text as delivery_mode,
                  requires_ad,
                  points_cost,
                  is_active
                from public.content_files
                order by created_at desc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def create_content_file(self, payload: dict, actor_user_id: str) -> dict:
        content_file_id = str(uuid4())
        await self._assert_content_target_exists(payload["content_kind"], payload["content_id"])
        await self.session.execute(
            text(
                """
                insert into public.content_files (
                  id,
                  content_kind,
                  content_id,
                  label,
                  quality,
                  format,
                  file_size_bytes,
                  storage_provider,
                  storage_bucket,
                  storage_key,
                  mime_type,
                  delivery_mode,
                  telegram_channel_id,
                  telegram_message_id,
                  requires_ad,
                  points_cost,
                  is_active,
                  created_by
                )
                values (
                  :id::uuid,
                  :content_kind::public.content_kind,
                  :content_id::uuid,
                  :label,
                  :quality,
                  :format,
                  :file_size_bytes,
                  :storage_provider::public.storage_provider,
                  :storage_bucket,
                  :storage_key,
                  :mime_type,
                  :delivery_mode::public.delivery_mode,
                  :telegram_channel_id,
                  :telegram_message_id,
                  :requires_ad,
                  :points_cost,
                  :is_active,
                  :created_by::uuid
                )
                """
            ),
            {
                "id": content_file_id,
                "created_by": actor_user_id,
                **payload,
            },
        )
        await self.session.commit()
        return {
            "id": content_file_id,
            "content_kind": payload["content_kind"],
            "content_id": payload["content_id"],
            "label": payload.get("label"),
            "quality": payload.get("quality"),
            "format": payload.get("format"),
            "storage_provider": payload["storage_provider"],
            "storage_key": payload["storage_key"],
            "delivery_mode": payload["delivery_mode"],
            "requires_ad": payload["requires_ad"],
            "points_cost": payload["points_cost"],
            "is_active": payload["is_active"],
        }

    async def _assert_content_target_exists(self, content_kind: str, content_id: str) -> None:
        table_map = {
            "movie": "public.movies",
            "series": "public.series",
            "episode": "public.episodes",
            "audio": "public.audio_items",
        }
        target_table = table_map.get(content_kind)
        if not target_table:
            raise AppError(code="content_kind_invalid", message="Unsupported content kind.", status_code=400)

        result = await self.session.execute(
            text(f"select 1 from {target_table} where id = :content_id::uuid limit 1"),
            {"content_id": content_id},
        )
        if result.first() is None:
            raise AppError(
                code="content_target_not_found",
                message="The content item for this file was not found.",
                status_code=404,
            )

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
