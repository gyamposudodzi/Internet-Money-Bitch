from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api.v1.routes.admin import get_admin_repository
from app.main import app


class StubAdminRepository:
    async def get_admin_identity(self, user_id: str):
        if user_id == "11111111-1111-1111-1111-111111111111":
            return SimpleNamespace(
                user_id=user_id,
                telegram_user_id=900000001,
                telegram_username="imb_admin",
                role="admin",
                can_manage_content=True,
                can_manage_users=True,
                can_manage_rewards=True,
                can_view_analytics=True,
            )
        return SimpleNamespace(
            user_id=user_id,
            telegram_user_id=900000003,
            telegram_username="limited_admin",
            role="editor",
            can_manage_content=True,
            can_manage_users=False,
            can_manage_rewards=False,
            can_view_analytics=False,
        )

    async def get_overview(self):
        return {
            "published_movies": 1,
            "published_audio": 1,
            "download_sessions": 4,
            "verified_ad_events": 2,
            "total_users": 2,
        }

    async def list_admin_users(self):
        return [
            {
                "user_id": "11111111-1111-1111-1111-111111111111",
                "telegram_username": "imb_admin",
                "role": "admin",
                "can_manage_content": True,
                "can_manage_users": True,
                "can_manage_rewards": True,
                "can_view_analytics": True,
            }
        ]


async def override_admin_repository():
    yield StubAdminRepository()


def _headers(user_id: str):
    return {
        "Authorization": "Bearer test-admin-token",
        "X-Admin-User-Id": user_id,
    }


def test_admin_me_requires_valid_headers(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/auth/me", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"]["telegram_username"] == "imb_admin"
    app.dependency_overrides.clear()


def test_admin_overview_requires_permission(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/analytics/overview", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"]["published_movies"] == 1
    app.dependency_overrides.clear()


def test_admin_users_denies_limited_admin(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/users", headers=_headers("99999999-9999-9999-9999-999999999999"))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "admin_permission_denied"
    app.dependency_overrides.clear()
