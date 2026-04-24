from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.v1.routes.telegram import get_download_repository
from app.main import app


class StubTelegramDownloadRepository:
    async def get_session_by_token(self, token: str):
        if token != "cccccccc-cccc-cccc-cccc-cccccccccccc":
            return None
        return SimpleNamespace(
            download_session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            session_token=token,
            telegram_user_id=900000002,
            telegram_username="imb_viewer",
            content_file_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            content_kind="movie",
            content_title="Heatline",
            file_label="Heatline 1080p",
            quality="1080p",
            format="mp4",
            ad_required=True,
            ad_completed=False,
            status="ad_pending",
            expires_at="2026-04-24T12:00:00+00:00",
            telegram_deep_link="https://t.me/demo_bot?start=cccccccc-cccc-cccc-cccc-cccccccccccc",
        )

    async def complete_session_by_token(self, token: str):
        session = await self.get_session_by_token(token)
        if session is None:
            return None
        session.status = "completed"
        return session


async def override_download_repository():
    yield StubTelegramDownloadRepository()


def test_get_telegram_session_returns_session_payload():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.get("/api/v1/telegram/session/cccccccc-cccc-cccc-cccc-cccccccccccc")

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["content_title"] == "Heatline"
    assert payload["status"] == "ad_pending"
    app.dependency_overrides.clear()


def test_telegram_webhook_parses_start_command():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/telegram/webhook",
        json={"message": {"text": "/start cccccccc-cccc-cccc-cccc-cccccccccccc"}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["command"] == "/start"
    assert payload["data"]["status"] == "ad_pending"
    assert payload["meta"]["content_title"] == "Heatline"
    app.dependency_overrides.clear()


def test_complete_telegram_session_marks_complete():
    app.dependency_overrides[get_download_repository] = override_download_repository
    client = TestClient(app)

    response = client.post("/api/v1/telegram/session/cccccccc-cccc-cccc-cccc-cccccccccccc/complete")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "completed"
    app.dependency_overrides.clear()
