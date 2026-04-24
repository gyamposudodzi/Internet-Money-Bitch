from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError


@dataclass(slots=True)
class AdCallbackResult:
    provider: str
    accepted: bool
    verified: bool
    duplicate: bool
    download_session_id: str | None
    session_token: str | None
    status: str | None
    reward_points: int


@dataclass(slots=True)
class AdEventResult:
    accepted: bool
    authoritative: bool
    verified: bool
    provider: str | None
    session_token: str | None


class AdRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def process_callback(self, provider_name: str, payload: dict) -> AdCallbackResult:
        provider = await self._get_provider(provider_name)
        external_event_id = payload.get("external_event_id")
        session_token = payload.get("session_token")
        event_type = payload.get("event_type", "completed")
        reward_points = int(payload.get("reward_points", 0) or 0)
        campaign = payload.get("campaign")

        if not session_token:
            raise AppError(
                code="session_token_missing",
                message="Ad callback requires a session_token.",
                status_code=400,
            )

        session_row = await self._get_session_by_token(session_token)
        if session_row is None:
            raise AppError(
                code="download_session_not_found",
                message="Download session not found for ad callback.",
                status_code=404,
            )

        if external_event_id:
            duplicate = await self._is_duplicate_event(str(provider["id"]), external_event_id)
            if duplicate:
                return AdCallbackResult(
                    provider=provider_name,
                    accepted=True,
                    verified=False,
                    duplicate=True,
                    download_session_id=session_row["download_session_id"],
                    session_token=session_token,
                    status=session_row["status"],
                    reward_points=0,
                )

        await self.session.execute(
            text(
                """
                insert into public.ad_events (
                  user_id,
                  download_session_id,
                  provider_id,
                  external_event_id,
                  event_type,
                  campaign,
                  reward_points,
                  verified,
                  metadata
                )
                values (
                  :user_id::uuid,
                  :download_session_id::uuid,
                  :provider_id::uuid,
                  :external_event_id,
                  :event_type::public.ad_event_type,
                  :campaign,
                  :reward_points,
                  true,
                  :metadata::jsonb
                )
                """
            ),
            {
                "user_id": session_row["user_id"],
                "download_session_id": session_row["download_session_id"],
                "provider_id": provider["id"],
                "external_event_id": external_event_id,
                "event_type": event_type,
                "campaign": campaign,
                "reward_points": reward_points,
                "metadata": self._json_string(payload),
            },
        )

        new_status = session_row["status"]
        if session_row["ad_required"]:
            new_status = "ad_verified"
            await self.session.execute(
                text(
                    """
                    update public.download_sessions
                    set
                      ad_required = false,
                      ad_completed = true,
                      unlocked_at = :unlocked_at,
                      status = 'ad_verified'
                    where id = :download_session_id::uuid
                    """
                ),
                {
                    "download_session_id": session_row["download_session_id"],
                    "unlocked_at": datetime.now(UTC),
                },
            )

        if reward_points > 0:
            new_balance = int(session_row["points_balance"]) + reward_points
            await self.session.execute(
                text(
                    "update public.users set points_balance = :balance where id = :user_id::uuid"
                ),
                {"balance": new_balance, "user_id": session_row["user_id"]},
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
                      'earn',
                      :amount,
                      :balance_after,
                      'ad_reward',
                      :reference_id::uuid,
                      :metadata::jsonb,
                      null
                    )
                    """
                ),
                {
                    "user_id": session_row["user_id"],
                    "amount": reward_points,
                    "balance_after": new_balance,
                    "reference_id": session_row["download_session_id"],
                    "metadata": self._json_string(
                        {"provider": provider_name, "campaign": campaign, "session_token": session_token}
                    ),
                },
            )

        await self.session.commit()

        return AdCallbackResult(
            provider=provider_name,
            accepted=True,
            verified=True,
            duplicate=False,
            download_session_id=session_row["download_session_id"],
            session_token=session_token,
            status=new_status,
            reward_points=reward_points,
        )

    async def record_event(self, payload: dict) -> AdEventResult:
        provider_name = payload.get("provider")
        session_token = payload.get("session_token")
        event_type = payload.get("event_type", "started")
        campaign = payload.get("campaign")
        external_event_id = payload.get("external_event_id")
        reward_points = int(payload.get("reward_points", 0) or 0)

        provider_id = None
        if provider_name:
            provider = await self._get_provider(provider_name)
            provider_id = provider["id"]

        session_row = None
        if session_token:
            session_row = await self._get_session_by_token(session_token)

        await self.session.execute(
            text(
                """
                insert into public.ad_events (
                  user_id,
                  download_session_id,
                  provider_id,
                  external_event_id,
                  event_type,
                  campaign,
                  reward_points,
                  verified,
                  metadata
                )
                values (
                  :user_id,
                  :download_session_id,
                  :provider_id,
                  :external_event_id,
                  :event_type::public.ad_event_type,
                  :campaign,
                  :reward_points,
                  false,
                  :metadata::jsonb
                )
                """
            ),
            {
                "user_id": None if session_row is None else session_row["user_id"],
                "download_session_id": None if session_row is None else session_row["download_session_id"],
                "provider_id": provider_id,
                "external_event_id": external_event_id,
                "event_type": event_type,
                "campaign": campaign,
                "reward_points": reward_points,
                "metadata": self._json_string(payload),
            },
        )
        await self.session.commit()

        return AdEventResult(
            accepted=True,
            authoritative=False,
            verified=False,
            provider=provider_name,
            session_token=session_token,
        )

    async def _get_provider(self, provider_name: str):
        result = await self.session.execute(
            text(
                """
                select id::text as id, name, is_active
                from public.ad_providers
                where name = :provider_name
                limit 1
                """
            ),
            {"provider_name": provider_name},
        )
        row = result.mappings().first()
        if not row or not row["is_active"]:
            raise AppError(code="ad_provider_not_found", message="Ad provider not found.", status_code=404)
        return row

    async def _get_session_by_token(self, session_token: str):
        result = await self.session.execute(
            text(
                """
                select
                  ds.id::text as download_session_id,
                  ds.session_token::text as session_token,
                  ds.user_id::text as user_id,
                  ds.status::text as status,
                  ds.ad_required,
                  u.points_balance
                from public.download_sessions ds
                join public.users u on u.id = ds.user_id
                where ds.session_token = :session_token::uuid
                limit 1
                """
            ),
            {"session_token": session_token},
        )
        return result.mappings().first()

    async def _is_duplicate_event(self, provider_id: str, external_event_id: str) -> bool:
        result = await self.session.execute(
            text(
                """
                select 1
                from public.ad_events
                where provider_id = :provider_id::uuid
                  and external_event_id = :external_event_id
                limit 1
                """
            ),
            {"provider_id": provider_id, "external_event_id": external_event_id},
        )
        return result.first() is not None

    @staticmethod
    def _json_string(payload: dict) -> str:
        import json

        return json.dumps(payload, separators=(",", ":"), sort_keys=True)
