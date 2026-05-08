from __future__ import annotations

import json
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

    async def list_platform_users(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as user_id,
                  telegram_user_id,
                  telegram_username,
                  role::text as role,
                  points_balance,
                  is_banned,
                  last_seen_at::text as last_seen_at
                from public.users
                order by created_at desc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def update_platform_user(self, user_id: str, payload: dict, actor_user_id: str) -> dict:
        user = await self._fetch_platform_user(user_id)
        updated = {**user, **payload}
        await self.session.execute(
            text(
                """
                update public.users
                set
                  is_banned = :is_banned,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": user_id, "is_banned": updated["is_banned"]},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="user.updated",
            entity_type="user",
            entity_id=user_id,
            metadata={
                "changes": {
                    "is_banned": updated["is_banned"],
                }
            },
        )
        await self.session.commit()
        return await self._platform_user_summary(user_id)

    async def adjust_user_points(self, user_id: str, payload: dict, actor_user_id: str) -> dict:
        user = await self._fetch_platform_user(user_id)
        balance_before = int(user["points_balance"])
        amount = int(payload["amount"])
        balance_after = balance_before + amount
        if balance_after < 0:
            raise AppError(
                code="points_balance_invalid",
                message="This adjustment would drop the user below zero points.",
                status_code=400,
            )

        await self.session.execute(
            text(
                """
                update public.users
                set
                  points_balance = :points_balance,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": user_id, "points_balance": balance_after},
        )
        await self.session.execute(
            text(
                """
                insert into public.point_transactions (
                  id,
                  user_id,
                  transaction_type,
                  amount,
                  balance_after,
                  source,
                  metadata,
                  created_by
                )
                values (
                  :id::uuid,
                  :user_id::uuid,
                  'adjustment'::public.point_tx_type,
                  :amount,
                  :balance_after,
                  'admin_adjustment',
                  :metadata::jsonb,
                  :created_by::uuid
                )
                """
            ),
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "amount": amount,
                "balance_after": balance_after,
                "metadata": json.dumps({"reason": payload["reason"]}),
                "created_by": actor_user_id,
            },
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="points.adjusted",
            entity_type="user",
            entity_id=user_id,
            metadata={
                "amount": amount,
                "balance_before": balance_before,
                "balance_after": balance_after,
                "reason": payload["reason"],
            },
        )
        await self.session.commit()
        return {
            "user": await self._platform_user_summary(user_id),
            "balance_before": balance_before,
            "balance_after": balance_after,
            "amount": amount,
            "reason": payload["reason"],
        }

    async def list_audit_logs(self, limit: int = 100) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  actor_user_id::text as actor_user_id,
                  action,
                  entity_type,
                  entity_id::text as entity_id,
                  metadata,
                  created_at::text as created_at
                from public.audit_logs
                order by created_at desc
                limit :limit
                """
            ),
            {"limit": limit},
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
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="movie.created",
            entity_type="movie",
            entity_id=movie_id,
            metadata={"slug": payload["slug"], "title": payload["title"]},
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

    async def update_movie(self, movie_id: str, payload: dict, actor_user_id: str | None = None) -> dict:
        existing = await self._fetch_movie(movie_id)
        updated = {**existing, **{key: value for key, value in payload.items() if value is not None}}
        await self.session.execute(
            text(
                """
                update public.movies
                set
                  title = :title,
                  slug = :slug,
                  synopsis = :synopsis,
                  poster_url = :poster_url,
                  backdrop_url = :backdrop_url,
                  release_year = :release_year,
                  duration_minutes = :duration_minutes,
                  language = :language,
                  country = :country,
                  imdb_rating = :imdb_rating,
                  publication_status = :publication_status::public.publication_status,
                  featured_rank = :featured_rank,
                  published_at = case when :publication_status = 'published' then coalesce(published_at, now()) else published_at end,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": movie_id, **updated},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="movie.updated",
            entity_type="movie",
            entity_id=movie_id,
            metadata={"changes": payload},
        )
        await self.session.commit()
        return await self._movie_summary(movie_id)

    async def archive_movie(self, movie_id: str, actor_user_id: str | None = None) -> dict:
        await self.session.execute(
            text(
                """
                update public.movies
                set publication_status = 'archived', updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": movie_id},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="movie.archived",
            entity_type="movie",
            entity_id=movie_id,
            metadata={},
        )
        await self.session.commit()
        return await self._movie_summary(movie_id)

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
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="audio.created",
            entity_type="audio",
            entity_id=audio_id,
            metadata={"slug": payload["slug"], "title": payload["title"]},
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

    async def update_audio(self, audio_id: str, payload: dict, actor_user_id: str | None = None) -> dict:
        existing = await self._fetch_audio(audio_id)
        updated = {**existing, **{key: value for key, value in payload.items() if value is not None}}
        await self.session.execute(
            text(
                """
                update public.audio_items
                set
                  title = :title,
                  slug = :slug,
                  artist = :artist,
                  album = :album,
                  synopsis = :synopsis,
                  cover_url = :cover_url,
                  language = :language,
                  duration_seconds = :duration_seconds,
                  publication_status = :publication_status::public.publication_status,
                  featured_rank = :featured_rank,
                  published_at = case when :publication_status = 'published' then coalesce(published_at, now()) else published_at end,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": audio_id, **updated},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="audio.updated",
            entity_type="audio",
            entity_id=audio_id,
            metadata={"changes": payload},
        )
        await self.session.commit()
        return await self._audio_summary(audio_id)

    async def archive_audio(self, audio_id: str, actor_user_id: str | None = None) -> dict:
        await self.session.execute(
            text(
                """
                update public.audio_items
                set publication_status = 'archived', updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": audio_id},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="audio.archived",
            entity_type="audio",
            entity_id=audio_id,
            metadata={},
        )
        await self.session.commit()
        return await self._audio_summary(audio_id)

    async def list_content_files(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  cf.id::text as id,
                  content_kind::text as content_kind,
                  content_id::text as content_id,
                  case
                    when cf.content_kind = 'movie' and m.id is not null then 'attached'
                    when cf.content_kind = 'audio' and a.id is not null then 'attached'
                    when cf.content_kind = 'series' and s.id is not null then 'attached'
                    when cf.content_kind = 'episode' and e.id is not null then 'attached'
                    else 'unassigned'
                  end as assignment_state,
                  case
                    when cf.content_kind = 'movie' then m.title
                    when cf.content_kind = 'audio' then a.title
                    when cf.content_kind = 'series' then s.title
                    when cf.content_kind = 'episode' then e.title
                    else null
                  end as assignment_label,
                  label,
                  quality,
                  format,
                  storage_provider::text as storage_provider,
                  storage_key,
                  delivery_mode::text as delivery_mode,
                  requires_ad,
                  points_cost,
                  is_active
                from public.content_files cf
                left join public.movies m
                  on cf.content_kind = 'movie' and m.id = cf.content_id
                left join public.audio_items a
                  on cf.content_kind = 'audio' and a.id = cf.content_id
                left join public.series s
                  on cf.content_kind = 'series' and s.id = cf.content_id
                left join public.episodes e
                  on cf.content_kind = 'episode' and e.id = cf.content_id
                order by cf.created_at desc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def list_homepage_sections(self) -> list[dict]:
        result = await self.session.execute(
            text(
                """
                select
                  hs.id::text as id,
                  hs.title,
                  hs.slug,
                  hs.sort_order,
                  hs.is_active,
                  hs.config
                from public.homepage_sections hs
                order by hs.sort_order asc, hs.title asc
                """
            )
        )
        return [dict(row) for row in result.mappings().all()]

    async def create_homepage_section(self, payload: dict, actor_user_id: str) -> dict:
        section_id = str(uuid4())
        await self.session.execute(
            text(
                """
                insert into public.homepage_sections (
                  id,
                  title,
                  slug,
                  sort_order,
                  is_active,
                  config
                )
                values (
                  :id::uuid,
                  :title,
                  :slug,
                  :sort_order,
                  :is_active,
                  :config::jsonb
                )
                """
            ),
            {
                "id": section_id,
                "title": payload["title"],
                "slug": payload["slug"],
                "sort_order": payload.get("sort_order", 0),
                "is_active": payload.get("is_active", True),
                "config": json.dumps(payload.get("config", {})),
            },
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="homepage_section.created",
            entity_type="homepage_section",
            entity_id=section_id,
            metadata=payload,
        )
        await self.session.commit()
        return await self._homepage_section_summary(section_id)

    async def update_homepage_section(
        self,
        section_id: str,
        payload: dict,
        actor_user_id: str | None = None,
    ) -> dict:
        existing = await self._fetch_homepage_section(section_id)
        updated = {**existing, **{key: value for key, value in payload.items() if value is not None}}
        await self.session.execute(
            text(
                """
                update public.homepage_sections
                set
                  title = :title,
                  slug = :slug,
                  sort_order = :sort_order,
                  is_active = :is_active,
                  config = :config::jsonb,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {
                "id": section_id,
                "title": updated["title"],
                "slug": updated["slug"],
                "sort_order": updated["sort_order"],
                "is_active": updated["is_active"],
                "config": json.dumps(updated.get("config", {})),
            },
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="homepage_section.updated",
            entity_type="homepage_section",
            entity_id=section_id,
            metadata=payload,
        )
        await self.session.commit()
        return await self._homepage_section_summary(section_id)

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
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="content_file.created",
            entity_type="content_file",
            entity_id=content_file_id,
            metadata={
                "content_kind": payload["content_kind"],
                "content_id": payload["content_id"],
                "storage_key": payload["storage_key"],
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

    async def update_content_file(
        self, content_file_id: str, payload: dict, actor_user_id: str | None = None
    ) -> dict:
        existing = await self._fetch_content_file(content_file_id)
        updated = {**existing, **{key: value for key, value in payload.items() if value is not None}}
        if "content_kind" in payload or "content_id" in payload:
            await self._assert_content_target_exists(updated["content_kind"], updated["content_id"])
        await self.session.execute(
            text(
                """
                update public.content_files
                set
                  content_kind = :content_kind::public.content_kind,
                  content_id = :content_id::uuid,
                  label = :label,
                  quality = :quality,
                  format = :format,
                  file_size_bytes = :file_size_bytes,
                  storage_provider = :storage_provider::public.storage_provider,
                  storage_bucket = :storage_bucket,
                  storage_key = :storage_key,
                  mime_type = :mime_type,
                  delivery_mode = :delivery_mode::public.delivery_mode,
                  telegram_channel_id = :telegram_channel_id,
                  telegram_message_id = :telegram_message_id,
                  requires_ad = :requires_ad,
                  points_cost = :points_cost,
                  is_active = :is_active,
                  updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": content_file_id, **updated},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="content_file.updated",
            entity_type="content_file",
            entity_id=content_file_id,
            metadata={"changes": payload},
        )
        await self.session.commit()
        return await self._content_file_summary(content_file_id)

    async def deactivate_content_file(self, content_file_id: str, actor_user_id: str | None = None) -> dict:
        await self.session.execute(
            text(
                """
                update public.content_files
                set is_active = false, updated_at = now()
                where id = :id::uuid
                """
            ),
            {"id": content_file_id},
        )
        await self._insert_audit_log(
            actor_user_id=actor_user_id,
            action="content_file.deactivated",
            entity_type="content_file",
            entity_id=content_file_id,
            metadata={},
        )
        await self.session.commit()
        return await self._content_file_summary(content_file_id)

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

    async def _fetch_movie(self, movie_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
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
                  publication_status::text as publication_status,
                  featured_rank
                from public.movies
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": movie_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="movie_not_found", message="Movie not found.", status_code=404)
        return dict(row)

    async def _movie_summary(self, movie_id: str) -> dict:
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
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": movie_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="movie_not_found", message="Movie not found.", status_code=404)
        return dict(row)

    async def _fetch_audio(self, audio_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
                  title,
                  slug,
                  artist,
                  album,
                  synopsis,
                  cover_url,
                  language,
                  duration_seconds,
                  publication_status::text as publication_status,
                  featured_rank
                from public.audio_items
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": audio_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="audio_not_found", message="Audio item not found.", status_code=404)
        return dict(row)

    async def _audio_summary(self, audio_id: str) -> dict:
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
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": audio_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="audio_not_found", message="Audio item not found.", status_code=404)
        return dict(row)

    async def _fetch_content_file(self, content_file_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
                  content_kind::text as content_kind,
                  content_id::text as content_id,
                  label,
                  quality,
                  format,
                  file_size_bytes,
                  storage_provider::text as storage_provider,
                  storage_bucket,
                  storage_key,
                  mime_type,
                  delivery_mode::text as delivery_mode,
                  telegram_channel_id,
                  telegram_message_id,
                  requires_ad,
                  points_cost,
                  is_active
                from public.content_files
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": content_file_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="content_file_not_found", message="Content file not found.", status_code=404)
        return dict(row)

    async def _content_file_summary(self, content_file_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
                  cf.id::text as id,
                  content_kind::text as content_kind,
                  content_id::text as content_id,
                  case
                    when cf.content_kind = 'movie' and m.id is not null then 'attached'
                    when cf.content_kind = 'audio' and a.id is not null then 'attached'
                    when cf.content_kind = 'series' and s.id is not null then 'attached'
                    when cf.content_kind = 'episode' and e.id is not null then 'attached'
                    else 'unassigned'
                  end as assignment_state,
                  case
                    when cf.content_kind = 'movie' then m.title
                    when cf.content_kind = 'audio' then a.title
                    when cf.content_kind = 'series' then s.title
                    when cf.content_kind = 'episode' then e.title
                    else null
                  end as assignment_label,
                  label,
                  quality,
                  format,
                  storage_provider::text as storage_provider,
                  storage_key,
                  delivery_mode::text as delivery_mode,
                  requires_ad,
                  points_cost,
                  is_active
                from public.content_files cf
                left join public.movies m
                  on cf.content_kind = 'movie' and m.id = cf.content_id
                left join public.audio_items a
                  on cf.content_kind = 'audio' and a.id = cf.content_id
                left join public.series s
                  on cf.content_kind = 'series' and s.id = cf.content_id
                left join public.episodes e
                  on cf.content_kind = 'episode' and e.id = cf.content_id
                where cf.id = :id::uuid
                limit 1
                """
            ),
            {"id": content_file_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="content_file_not_found", message="Content file not found.", status_code=404)
        return dict(row)

    async def _fetch_platform_user(self, user_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as user_id,
                  telegram_user_id,
                  telegram_username,
                  role::text as role,
                  points_balance,
                  is_banned,
                  last_seen_at::text as last_seen_at
                from public.users
                where id = :id::uuid
                limit 1
                """
            ),
            {"id": user_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="user_not_found", message="User not found.", status_code=404)
        return dict(row)

    async def _platform_user_summary(self, user_id: str) -> dict:
        return await self._fetch_platform_user(user_id)

    async def _fetch_homepage_section(self, section_id: str) -> dict:
        result = await self.session.execute(
            text(
                """
                select
                  hs.id::text as id,
                  hs.title,
                  hs.slug,
                  hs.sort_order,
                  hs.is_active,
                  hs.config
                from public.homepage_sections hs
                where hs.id = :id::uuid
                limit 1
                """
            ),
            {"id": section_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(
                code="homepage_section_not_found",
                message="Homepage section not found.",
                status_code=404,
            )
        return dict(row)

    async def _homepage_section_summary(self, section_id: str) -> dict:
        row = await self._fetch_homepage_section(section_id)
        return {
            "id": row["id"],
            "title": row["title"],
            "slug": row["slug"],
            "sort_order": row["sort_order"],
            "is_active": row["is_active"],
            "config": row.get("config") or {},
        }

    async def _insert_audit_log(
        self,
        actor_user_id: str | None,
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
