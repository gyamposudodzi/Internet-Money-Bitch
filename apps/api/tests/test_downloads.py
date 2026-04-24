from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.v1.routes.downloads import get_download_repository
from app.core.errors import AppError
from app.main import app


class StubDownloadRepository:
    async def create_session(self, *, content_file_id: str, consume_points: bool, user_id: str):
        if content_file_id == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa":
            return SimpleNamespace(
                download_session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                session_token="cccccccc-cccc-cccc-cccc-cccccccccccc",
                ad_required=not consume_points,
                points_cost=15,
                points_spent=15 if consume_points else 0,
                telegram_deep_link="https://t.me/demo_bot?start=token",
                expires_at="2026-04-24T12:00:00+00:00",
                status="created" if consume_points else "ad_pending",
                content_file_id=content_file_id,
            )
        raise AppError(code="content_file_not_found", message="Content file not found.", status_code=404)

    async def get_session(self, session_id: str):
        if session_id != "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb":
            return None
        return SimpleNamespace(
            download_session_id=session_id,
            session_token="cccccccc-cccc-cccc-cccc-cccccccccccc",
            ad_required=True,
            points_cost=15,
            points_spent=0,
            telegram_deep_link="https://t.me/demo_bot?start=token",
            expires_at="2026-04-24T12:00:00+00:00",
            status="ad_pending",
            content_file_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        )

    async def use_points(self, session_id: str, user_id: str):
        return SimpleNamespace(
            download_session_id=session_id,
            session_token="cccccccc-cccc-cccc-cccc-cccccccccccc",
            ad_required=False,
            points_cost=15,
            points_spent=15,
            telegram_deep_link="https://t.me/demo_bot?start=token",
            expires_at="2026-04-24T12:00:00+00:00",
            status="created",
            content_file_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        )

    async def cancel_session(self, session_id: str):
        if session_id != "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb":
            return None
        return SimpleNamespace(
            download_session_id=session_id,
            session_token="cccccccc-cccc-cccc-cccc-cccccccccccc",
            ad_required=True,
            points_cost=15,
            points_spent=0,
            telegram_deep_link="https://t.me/demo_bot?start=token",
            expires_at="2026-04-24T12:00:00+00:00",
            status="cancelled",
            content_file_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        )


async def override_download_repository():
    yield StubDownloadRepository()


def test_create_download_session_returns_structured_payload():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/download-sessions",
        json={
            "content_file_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "consume_points": False,
            "user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["status"] == "ad_pending"
    assert payload["points_cost"] == 15
    app.dependency_overrides.clear()


def test_get_download_session_returns_not_found():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.get("/api/v1/download-sessions/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "download_session_not_found"
    app.dependency_overrides.clear()


def test_use_points_unlocks_session():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/download-sessions/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/use-points",
        params={"user_id": "dddddddd-dddd-dddd-dddd-dddddddddddd"},
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["ad_required"] is False
    assert payload["points_spent"] == 15
    app.dependency_overrides.clear()
