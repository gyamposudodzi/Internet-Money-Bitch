from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.v1.routes.ads import get_ad_repository
from app.main import app


class StubAdRepository:
    async def process_callback(self, provider: str, payload: dict):
        return SimpleNamespace(
            provider=provider,
            accepted=True,
            verified=True,
            duplicate=False,
            download_session_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            session_token=payload.get("session_token"),
            status="ad_verified",
            reward_points=int(payload.get("reward_points", 0) or 0),
        )

    async def record_event(self, payload: dict):
        return SimpleNamespace(
            accepted=True,
            authoritative=False,
            verified=False,
            provider=payload.get("provider"),
            session_token=payload.get("session_token"),
        )


async def override_ad_repository():
    yield StubAdRepository()


def test_ad_callback_returns_verified_payload():
    app.dependency_overrides[get_ad_repository] = override_ad_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/ads/callback/house_ads",
        json={
            "session_token": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "external_event_id": "evt-123",
            "event_type": "completed",
            "reward_points": 5,
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["verified"] is True
    assert payload["status"] == "ad_verified"
    assert payload["reward_points"] == 5
    app.dependency_overrides.clear()


def test_record_ad_event_is_non_authoritative():
    app.dependency_overrides[get_ad_repository] = override_ad_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/ads/events",
        json={
            "provider": "house_ads",
            "session_token": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "event_type": "started",
        },
    )

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["authoritative"] is False
    assert payload["provider"] == "house_ads"
    app.dependency_overrides.clear()
