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

    async def list_movies(self):
        return [
            {
                "id": "44444444-4444-4444-4444-444444444441",
                "title": "Heatline",
                "slug": "heatline",
                "release_year": 2026,
                "language": "en",
                "publication_status": "published",
                "featured_rank": 1,
            }
        ]

    async def create_movie(self, payload: dict, actor_user_id: str):
        return {
            "id": "aaaa1111-1111-1111-1111-111111111111",
            "title": payload["title"],
            "slug": payload["slug"],
            "release_year": payload.get("release_year"),
            "language": payload.get("language"),
            "publication_status": payload["publication_status"],
            "featured_rank": payload.get("featured_rank"),
        }

    async def update_movie(self, movie_id: str, payload: dict):
        return {
            "id": movie_id,
            "title": payload.get("title", "Heatline"),
            "slug": payload.get("slug", "heatline"),
            "release_year": payload.get("release_year", 2026),
            "language": payload.get("language", "en"),
            "publication_status": payload.get("publication_status", "draft"),
            "featured_rank": payload.get("featured_rank"),
        }

    async def archive_movie(self, movie_id: str):
        return {
            "id": movie_id,
            "title": "Heatline",
            "slug": "heatline",
            "release_year": 2026,
            "language": "en",
            "publication_status": "archived",
            "featured_rank": 1,
        }

    async def list_audio(self):
        return [
            {
                "id": "55555555-5555-5555-5555-555555555551",
                "title": "Night Drive",
                "slug": "night-drive",
                "artist": "Sora Vale",
                "album": "City Afterlight",
                "language": "en",
                "publication_status": "published",
                "featured_rank": 1,
            }
        ]

    async def create_audio(self, payload: dict, actor_user_id: str):
        return {
            "id": "bbbb1111-1111-1111-1111-111111111111",
            "title": payload["title"],
            "slug": payload["slug"],
            "artist": payload.get("artist"),
            "album": payload.get("album"),
            "language": payload.get("language"),
            "publication_status": payload["publication_status"],
            "featured_rank": payload.get("featured_rank"),
        }

    async def update_audio(self, audio_id: str, payload: dict):
        return {
            "id": audio_id,
            "title": payload.get("title", "Night Drive"),
            "slug": payload.get("slug", "night-drive"),
            "artist": payload.get("artist", "Sora Vale"),
            "album": payload.get("album", "City Afterlight"),
            "language": payload.get("language", "en"),
            "publication_status": payload.get("publication_status", "draft"),
            "featured_rank": payload.get("featured_rank"),
        }

    async def archive_audio(self, audio_id: str):
        return {
            "id": audio_id,
            "title": "Night Drive",
            "slug": "night-drive",
            "artist": "Sora Vale",
            "album": "City Afterlight",
            "language": "en",
            "publication_status": "archived",
            "featured_rank": 1,
        }

    async def list_content_files(self):
        return [
            {
                "id": "66666666-6666-6666-6666-666666666661",
                "content_kind": "movie",
                "content_id": "44444444-4444-4444-4444-444444444441",
                "label": "Heatline 720p",
                "quality": "720p",
                "format": "mp4",
                "storage_provider": "r2",
                "storage_key": "heatline/heatline-720p.mp4",
                "delivery_mode": "telegram_bot",
                "requires_ad": True,
                "points_cost": 10,
                "is_active": True,
            }
        ]

    async def create_content_file(self, payload: dict, actor_user_id: str):
        return {
            "id": "cccc1111-1111-1111-1111-111111111111",
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

    async def update_content_file(self, content_file_id: str, payload: dict):
        return {
            "id": content_file_id,
            "content_kind": "movie",
            "content_id": "44444444-4444-4444-4444-444444444441",
            "label": payload.get("label", "Heatline 720p"),
            "quality": payload.get("quality", "720p"),
            "format": payload.get("format", "mp4"),
            "storage_provider": payload.get("storage_provider", "r2"),
            "storage_key": payload.get("storage_key", "heatline/heatline-720p.mp4"),
            "delivery_mode": payload.get("delivery_mode", "telegram_bot"),
            "requires_ad": payload.get("requires_ad", True),
            "points_cost": payload.get("points_cost", 10),
            "is_active": payload.get("is_active", True),
        }

    async def deactivate_content_file(self, content_file_id: str):
        return {
            "id": content_file_id,
            "content_kind": "movie",
            "content_id": "44444444-4444-4444-4444-444444444441",
            "label": "Heatline 720p",
            "quality": "720p",
            "format": "mp4",
            "storage_provider": "r2",
            "storage_key": "heatline/heatline-720p.mp4",
            "delivery_mode": "telegram_bot",
            "requires_ad": True,
            "points_cost": 10,
            "is_active": False,
        }


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


def test_admin_movies_list_for_content_manager(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/movies", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["slug"] == "heatline"
    app.dependency_overrides.clear()


def test_admin_create_movie(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/movies",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "title": "New Drop",
            "slug": "new-drop",
            "release_year": 2026,
            "language": "en",
            "publication_status": "draft",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "New Drop"
    app.dependency_overrides.clear()


def test_admin_create_audio(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/audio",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "title": "Static Echo",
            "slug": "static-echo",
            "artist": "Nova",
            "publication_status": "draft",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["slug"] == "static-echo"
    app.dependency_overrides.clear()


def test_admin_create_content_file(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/content-files",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "content_kind": "movie",
            "content_id": "44444444-4444-4444-4444-444444444441",
            "label": "Heatline 4K",
            "quality": "4K",
            "format": "mp4",
            "storage_provider": "r2",
            "storage_key": "heatline/heatline-4k.mp4",
            "delivery_mode": "telegram_bot",
            "requires_ad": True,
            "points_cost": 25,
            "is_active": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["quality"] == "4K"
    app.dependency_overrides.clear()


def test_admin_update_movie(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.patch(
        "/api/v1/admin/movies/44444444-4444-4444-4444-444444444441",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={"title": "Heatline Redux", "publication_status": "published"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "Heatline Redux"
    app.dependency_overrides.clear()


def test_admin_archive_audio(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.delete(
        "/api/v1/admin/audio/55555555-5555-5555-5555-555555555551",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
    )

    assert response.status_code == 200
    assert response.json()["data"]["publication_status"] == "archived"
    app.dependency_overrides.clear()


def test_admin_deactivate_content_file(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.delete(
        "/api/v1/admin/content-files/66666666-6666-6666-6666-666666666661",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
    )

    assert response.status_code == 200
    assert response.json()["data"]["is_active"] is False
    app.dependency_overrides.clear()
