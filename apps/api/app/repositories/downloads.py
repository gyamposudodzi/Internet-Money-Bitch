from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError


@dataclass(slots=True)
class DownloadSessionRecord:
    download_session_id: str
    session_token: str
    ad_required: bool
    points_cost: int
    points_spent: int
    telegram_deep_link: str | None
    expires_at: str
    status: str
    content_file_id: str


@dataclass(slots=True)
class TelegramSessionRecord:
    download_session_id: str
    session_token: str
    telegram_user_id: int | None
    telegram_username: str | None
    content_file_id: str
    content_kind: str
    content_title: str
    file_label: str | None
    quality: str | None
    format: str | None
    ad_required: bool
    ad_completed: bool
    status: str
    expires_at: str
    telegram_deep_link: str | None


class DownloadRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_session(
        self,
        *,
        content_file_id: str,
        consume_points: bool,
        user_id: str,
    ) -> DownloadSessionRecord:
        file_row = await self._get_content_file(content_file_id)
        user_row = await self._get_user(user_id)

        points_cost = int(file_row["points_cost"])
        requires_ad = bool(file_row["requires_ad"])
        points_spent = 0

        if consume_points:
            if user_row["points_balance"] < points_cost:
                raise AppError(
                    code="insufficient_points",
                    message="Not enough points to skip the ad for this file.",
                    status_code=400,
                )
            points_spent = points_cost
            requires_ad = False

        session_id = str(uuid4())
        session_token = str(uuid4())
        expires_at = datetime.now(UTC) + timedelta(minutes=settings.download_session_ttl_minutes)
        status = "ad_pending" if requires_ad else "created"

        await self.session.execute(
            text(
                """
                insert into public.download_sessions (
                  id,
                  session_token,
                  user_id,
                  content_file_id,
                  status,
                  ad_required,
                  ad_completed,
                  points_spent,
                  unlocked_at,
                  expires_at
                )
                values (
                  :id,
                  :session_token::uuid,
                  :user_id::uuid,
                  :content_file_id::uuid,
                  :status::public.session_status,
                  :ad_required,
                  :ad_completed,
                  :points_spent,
                  :unlocked_at,
                  :expires_at
                )
                """
            ),
            {
                "id": session_id,
                "session_token": session_token,
                "user_id": user_id,
                "content_file_id": content_file_id,
                "status": status,
                "ad_required": requires_ad,
                "ad_completed": not requires_ad,
                "points_spent": points_spent,
                "unlocked_at": None if requires_ad else datetime.now(UTC),
                "expires_at": expires_at,
            },
        )

        if points_spent > 0:
            new_balance = int(user_row["points_balance"]) - points_spent
            await self.session.execute(
                text("update public.users set points_balance = :balance where id = :user_id::uuid"),
                {"balance": new_balance, "user_id": user_id},
            )
            await self.session.execute(
                text(
                    """
                    insert into public.point_transactions (
                      user_id,
                      transaction_type,
                      amount,
                      balance_after,
                      source,
                      reference_id,
                      metadata,
                      created_by
                    )
                    values (
                      :user_id::uuid,
                      'spend',
                      :amount,
                      :balance_after,
                      'download_session',
                      :reference_id::uuid,
                      :metadata::jsonb,
                      :created_by::uuid
                    )
                    """
                ),
                {
                    "user_id": user_id,
                    "amount": -points_spent,
                    "balance_after": new_balance,
                    "reference_id": session_id,
                    "metadata": '{"reason":"ad_bypass"}',
                    "created_by": user_id,
                },
            )

        await self.session.commit()
        return DownloadSessionRecord(
            download_session_id=session_id,
            session_token=session_token,
            ad_required=requires_ad,
            points_cost=points_cost,
            points_spent=points_spent,
            telegram_deep_link=self._build_telegram_link(session_token),
            expires_at=expires_at.isoformat(),
            status=status,
            content_file_id=content_file_id,
        )

    async def get_session(self, session_id: str) -> DownloadSessionRecord | None:
        row = await self.session.execute(
            text(
                """
                select
                  ds.id::text as download_session_id,
                  ds.session_token::text as session_token,
                  ds.ad_required,
                  cf.points_cost,
                  ds.points_spent,
                  ds.expires_at,
                  ds.status::text as status,
                  ds.content_file_id::text as content_file_id
                from public.download_sessions ds
                join public.content_files cf on cf.id = ds.content_file_id
                where ds.id = :session_id::uuid
                limit 1
                """
            ),
            {"session_id": session_id},
        )
        session_row = row.mappings().first()
        if not session_row:
            return None

        return DownloadSessionRecord(
            download_session_id=session_row["download_session_id"],
            session_token=session_row["session_token"],
            ad_required=bool(session_row["ad_required"]),
            points_cost=int(session_row["points_cost"]),
            points_spent=int(session_row["points_spent"]),
            telegram_deep_link=self._build_telegram_link(session_row["session_token"]),
            expires_at=session_row["expires_at"].isoformat(),
            status=session_row["status"],
            content_file_id=session_row["content_file_id"],
        )

    async def get_session_by_token(self, session_token: str) -> TelegramSessionRecord | None:
        result = await self.session.execute(
            text(
                """
                select
                  ds.id::text as download_session_id,
                  ds.session_token::text as session_token,
                  u.telegram_user_id,
                  u.telegram_username,
                  ds.content_file_id::text as content_file_id,
                  cf.content_kind::text as content_kind,
                  coalesce(m.title, a.title, e.title, s.title) as content_title,
                  cf.label as file_label,
                  cf.quality,
                  cf.format,
                  ds.ad_required,
                  ds.ad_completed,
                  ds.status::text as status,
                  ds.expires_at
                from public.download_sessions ds
                join public.users u on u.id = ds.user_id
                join public.content_files cf on cf.id = ds.content_file_id
                left join public.movies m
                  on cf.content_kind = 'movie' and m.id = cf.content_id
                left join public.audio_items a
                  on cf.content_kind = 'audio' and a.id = cf.content_id
                left join public.episodes e
                  on cf.content_kind = 'episode' and e.id = cf.content_id
                left join public.series s
                  on cf.content_kind = 'series' and s.id = cf.content_id
                where ds.session_token = :session_token::uuid
                limit 1
                """
            ),
            {"session_token": session_token},
        )
        row = result.mappings().first()
        if not row:
            return None

        return TelegramSessionRecord(
            download_session_id=row["download_session_id"],
            session_token=row["session_token"],
            telegram_user_id=row["telegram_user_id"],
            telegram_username=row["telegram_username"],
            content_file_id=row["content_file_id"],
            content_kind=row["content_kind"],
            content_title=row["content_title"] or "Untitled content",
            file_label=row["file_label"],
            quality=row["quality"],
            format=row["format"],
            ad_required=bool(row["ad_required"]),
            ad_completed=bool(row["ad_completed"]),
            status=row["status"],
            expires_at=row["expires_at"].isoformat(),
            telegram_deep_link=self._build_telegram_link(row["session_token"]),
        )

    async def cancel_session(self, session_id: str) -> DownloadSessionRecord | None:
        await self.session.execute(
            text(
                """
                update public.download_sessions
                set status = 'cancelled'
                where id = :session_id::uuid
                """
            ),
            {"session_id": session_id},
        )
        await self.session.commit()
        return await self.get_session(session_id)

    async def complete_session_by_token(self, session_token: str) -> TelegramSessionRecord | None:
        await self.session.execute(
            text(
                """
                update public.download_sessions
                set
                  status = 'completed',
                  consumed_at = :consumed_at
                where session_token = :session_token::uuid
                """
            ),
            {"session_token": session_token, "consumed_at": datetime.now(UTC)},
        )
        await self.session.commit()
        return await self.get_session_by_token(session_token)

    async def use_points(self, session_id: str, user_id: str) -> DownloadSessionRecord:
        session_row = await self.get_session(session_id)
        if session_row is None:
            raise AppError(code="download_session_not_found", message="Download session not found.", status_code=404)
        if not session_row.ad_required:
            return session_row

        user_row = await self._get_user(user_id)
        if user_row["points_balance"] < session_row.points_cost:
            raise AppError(
                code="insufficient_points",
                message="Not enough points to unlock this session.",
                status_code=400,
            )

        new_balance = int(user_row["points_balance"]) - int(session_row.points_cost)
        now = datetime.now(UTC)

        await self.session.execute(
            text(
                """
                update public.download_sessions
                set
                  ad_required = false,
                  ad_completed = true,
                  points_spent = :points_spent,
                  unlocked_at = :unlocked_at,
                  status = 'created'
                where id = :session_id::uuid
                """
            ),
            {
                "session_id": session_id,
                "points_spent": session_row.points_cost,
                "unlocked_at": now,
            },
        )
        await self.session.execute(
            text("update public.users set points_balance = :balance where id = :user_id::uuid"),
            {"balance": new_balance, "user_id": user_id},
        )
        await self.session.execute(
            text(
                """
                insert into public.point_transactions (
                  user_id,
                  transaction_type,
                  amount,
                  balance_after,
                  source,
                  reference_id,
                  metadata,
                  created_by
                )
                values (
                  :user_id::uuid,
                  'spend',
                  :amount,
                  :balance_after,
                  'download_session',
                  :reference_id::uuid,
                  :metadata::jsonb,
                  :created_by::uuid
                )
                """
            ),
            {
                "user_id": user_id,
                "amount": -session_row.points_cost,
                "balance_after": new_balance,
                "reference_id": session_id,
                "metadata": '{"reason":"post_create_ad_bypass"}',
                "created_by": user_id,
            },
        )
        await self.session.commit()

        updated = await self.get_session(session_id)
        if updated is None:
            raise AppError(code="download_session_not_found", message="Download session not found.", status_code=404)
        return updated

    async def _get_content_file(self, content_file_id: str):
        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  points_cost,
                  requires_ad,
                  is_active
                from public.content_files
                where id = :content_file_id::uuid
                limit 1
                """
            ),
            {"content_file_id": content_file_id},
        )
        row = result.mappings().first()
        if not row or not row["is_active"]:
            raise AppError(code="content_file_not_found", message="Content file not found.", status_code=404)
        return row

    async def _get_user(self, user_id: str):
        result = await self.session.execute(
            text(
                """
                select id::text as id, points_balance, is_banned
                from public.users
                where id = :user_id::uuid
                limit 1
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError(code="user_not_found", message="User not found.", status_code=404)
        if row["is_banned"]:
            raise AppError(code="user_banned", message="This user account is banned.", status_code=403)
        return row

    @staticmethod
    def _build_telegram_link(session_token: str) -> str | None:
        if not settings.telegram_bot_username:
            return None
        return f"https://t.me/{settings.telegram_bot_username}?start={session_token}"


def validate_uuid(value: str, *, field_name: str) -> str:
    try:
        UUID(value)
    except ValueError as exc:
        raise AppError(code="invalid_uuid", message=f"{field_name} must be a valid UUID.", status_code=422) from exc
    return value
