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

    async def list_platform_users(self):
        return [
            {
                "user_id": "22222222-2222-2222-2222-222222222222",
                "telegram_user_id": 900000002,
                "telegram_username": "moviefan",
                "role": "user",
                "points_balance": 14,
                "is_banned": False,
                "last_seen_at": "2026-05-06T10:00:00+00:00",
            }
        ]

    async def update_platform_user(self, user_id: str, payload: dict, actor_user_id: str):
        return {
            "user_id": user_id,
            "telegram_user_id": 900000002,
            "telegram_username": "moviefan",
            "role": "user",
            "points_balance": 14,
            "is_banned": payload["is_banned"],
            "last_seen_at": "2026-05-06T10:00:00+00:00",
        }

    async def adjust_user_points(self, user_id: str, payload: dict, actor_user_id: str):
        return {
            "user": {
                "user_id": user_id,
                "telegram_user_id": 900000002,
                "telegram_username": "moviefan",
                "role": "user",
                "points_balance": 19,
                "is_banned": False,
                "last_seen_at": "2026-05-06T10:00:00+00:00",
            },
            "balance_before": 14,
            "balance_after": 19,
            "amount": payload["amount"],
            "reason": payload["reason"],
        }

    async def list_audit_logs(self):
        return [
            {
                "id": "dddd1111-1111-1111-1111-111111111111",
                "actor_user_id": "11111111-1111-1111-1111-111111111111",
                "action": "points.adjusted",
                "entity_type": "user",
                "entity_id": "22222222-2222-2222-2222-222222222222",
                "metadata": {"amount": 5, "reason": "manual bonus"},
                "created_at": "2026-05-06T10:05:00+00:00",
            }
        ]

    async def list_genres(self):
        return [
            {"id": "33333333-3333-3333-3333-333333333331", "name": "Action", "slug": "action"},
            {"id": "33333333-3333-3333-3333-333333333334", "name": "Anime", "slug": "anime"},
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
                "genre_slugs": ["action"],
            }
        ]

    async def list_series(self):
        return [
            {
                "id": "77777777-7777-7777-7777-777777777773",
                "title": "Seoul Echoes",
                "slug": "seoul-echoes",
                "release_year": 2026,
                "language": "ko",
                "publication_status": "published",
                "featured_rank": 2,
                "genre_slugs": ["drama", "anime"],
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
            "genre_slugs": payload.get("genre_slugs", []),
        }

    async def create_series(self, payload: dict, actor_user_id: str):
        return {
            "id": "eeee1111-1111-1111-1111-111111111111",
            "title": payload["title"],
            "slug": payload["slug"],
            "release_year": payload.get("release_year"),
            "language": payload.get("language"),
            "publication_status": payload["publication_status"],
            "featured_rank": payload.get("featured_rank"),
            "genre_slugs": payload.get("genre_slugs", []),
        }

    async def update_movie(self, movie_id: str, payload: dict, actor_user_id: str | None = None):
        return {
            "id": movie_id,
            "title": payload.get("title", "Heatline"),
            "slug": payload.get("slug", "heatline"),
            "release_year": payload.get("release_year", 2026),
            "language": payload.get("language", "en"),
            "publication_status": payload.get("publication_status", "draft"),
            "featured_rank": payload.get("featured_rank"),
            "genre_slugs": payload.get("genre_slugs", ["action"]),
        }

    async def update_series(self, series_id: str, payload: dict, actor_user_id: str | None = None):
        return {
            "id": series_id,
            "title": payload.get("title", "Seoul Echoes"),
            "slug": payload.get("slug", "seoul-echoes"),
            "release_year": payload.get("release_year", 2026),
            "language": payload.get("language", "ko"),
            "publication_status": payload.get("publication_status", "draft"),
            "featured_rank": payload.get("featured_rank"),
            "genre_slugs": payload.get("genre_slugs", ["drama"]),
        }

    async def archive_movie(self, movie_id: str, actor_user_id: str | None = None):
        return {
            "id": movie_id,
            "title": "Heatline",
            "slug": "heatline",
            "release_year": 2026,
            "language": "en",
            "publication_status": "archived",
            "featured_rank": 1,
            "genre_slugs": ["action"],
        }

    async def archive_series(self, series_id: str, actor_user_id: str | None = None):
        return {
            "id": series_id,
            "title": "Seoul Echoes",
            "slug": "seoul-echoes",
            "release_year": 2026,
            "language": "ko",
            "publication_status": "archived",
            "featured_rank": 2,
            "genre_slugs": ["drama"],
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

    async def update_audio(self, audio_id: str, payload: dict, actor_user_id: str | None = None):
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

    async def archive_audio(self, audio_id: str, actor_user_id: str | None = None):
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

    async def list_homepage_sections(self):
        return [
            {
                "id": "77777777-7777-7777-7777-777777777771",
                "title": "Hot Movies",
                "slug": "hot-movies",
                "sort_order": 1,
                "is_active": True,
                "config": {"content_type": "movie", "sort": "popular", "limit": 12},
            }
        ]

    async def create_homepage_section(self, payload: dict, actor_user_id: str):
        return {
            "id": "77777777-7777-7777-7777-777777777772",
            "title": payload["title"],
            "slug": payload["slug"],
            "sort_order": payload.get("sort_order", 0),
            "is_active": payload.get("is_active", True),
            "config": payload.get("config", {}),
        }

    async def update_homepage_section(self, section_id: str, payload: dict, actor_user_id: str | None = None):
        return {
            "id": section_id,
            "title": payload.get("title", "Hot Movies"),
            "slug": payload.get("slug", "hot-movies"),
            "sort_order": payload.get("sort_order", 1),
            "is_active": payload.get("is_active", True),
            "config": payload.get("config", {"content_type": "movie", "sort": "popular", "limit": 12}),
        }

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

    async def update_content_file(self, content_file_id: str, payload: dict, actor_user_id: str | None = None):
        return {
            "id": content_file_id,
            "content_kind": payload.get("content_kind", "movie"),
            "content_id": payload.get("content_id", "44444444-4444-4444-4444-444444444441"),
            "assignment_state": "attached",
            "assignment_label": "Heatline",
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

    async def deactivate_content_file(self, content_file_id: str, actor_user_id: str | None = None):
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


def test_admin_login_accepts_username_or_email(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    monkeypatch.setattr("app.core.config.settings.admin_login_username", "imb_admin")
    monkeypatch.setattr("app.core.config.settings.admin_login_email", "admin@example.com")
    monkeypatch.setattr("app.core.config.settings.admin_login_password", "super-secret")
    monkeypatch.setattr(
        "app.core.config.settings.admin_login_user_id",
        "11111111-1111-1111-1111-111111111111",
    )
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/auth/login",
        json={"identifier": "admin@example.com", "password": "super-secret"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["access_token"] == "test-admin-token"
    assert response.json()["data"]["admin_user_id"] == "11111111-1111-1111-1111-111111111111"
    app.dependency_overrides.clear()


def test_admin_login_rejects_invalid_credentials(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    monkeypatch.setattr("app.core.config.settings.admin_login_username", "imb_admin")
    monkeypatch.setattr("app.core.config.settings.admin_login_email", "admin@example.com")
    monkeypatch.setattr("app.core.config.settings.admin_login_password", "super-secret")
    monkeypatch.setattr(
        "app.core.config.settings.admin_login_user_id",
        "11111111-1111-1111-1111-111111111111",
    )
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/auth/login",
        json={"identifier": "wrong@example.com", "password": "bad-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "admin_login_invalid"
    app.dependency_overrides.clear()


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


def test_admin_platform_users_list(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/platform-users", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["telegram_username"] == "moviefan"
    app.dependency_overrides.clear()


def test_admin_can_ban_platform_user(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.patch(
        "/api/v1/admin/platform-users/22222222-2222-2222-2222-222222222222",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={"is_banned": True},
    )

    assert response.status_code == 200
    assert response.json()["data"]["is_banned"] is True
    app.dependency_overrides.clear()


def test_admin_can_adjust_user_points(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/platform-users/22222222-2222-2222-2222-222222222222/points-adjustments",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={"amount": 5, "reason": "manual bonus"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["balance_after"] == 19
    app.dependency_overrides.clear()


def test_admin_can_view_audit_logs(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/audit-logs", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["action"] == "points.adjusted"
    app.dependency_overrides.clear()


def test_admin_movies_list_for_content_manager(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/movies", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["slug"] == "heatline"
    assert response.json()["data"][0]["genre_slugs"] == ["action"]
    app.dependency_overrides.clear()


def test_admin_series_list_for_content_manager(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/series", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["slug"] == "seoul-echoes"
    assert response.json()["data"][0]["genre_slugs"] == ["drama", "anime"]
    app.dependency_overrides.clear()


def test_admin_genres_list_for_content_manager(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/genres", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][1]["slug"] == "anime"
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
            "genre_slugs": ["action", "anime"],
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "New Drop"
    assert response.json()["data"]["genre_slugs"] == ["action", "anime"]
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


def test_admin_create_series(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/series",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "title": "Glass Harbor",
            "slug": "glass-harbor",
            "release_year": 2026,
            "language": "ko",
            "publication_status": "draft",
            "genre_slugs": ["drama"],
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["slug"] == "glass-harbor"
    assert response.json()["data"]["genre_slugs"] == ["drama"]
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
        json={"title": "Heatline Redux", "publication_status": "published", "genre_slugs": ["anime"]},
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "Heatline Redux"
    assert response.json()["data"]["genre_slugs"] == ["anime"]
    app.dependency_overrides.clear()


def test_admin_update_series(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.patch(
        "/api/v1/admin/series/77777777-7777-7777-7777-777777777773",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={"title": "Seoul Echoes Reloaded", "publication_status": "published", "genre_slugs": ["anime"]},
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "Seoul Echoes Reloaded"
    assert response.json()["data"]["genre_slugs"] == ["anime"]
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


def test_admin_archive_series(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.delete(
        "/api/v1/admin/series/77777777-7777-7777-7777-777777777773",
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


def test_admin_reassign_content_file(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.patch(
        "/api/v1/admin/content-files/66666666-6666-6666-6666-666666666661",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "content_kind": "audio",
            "content_id": "55555555-5555-5555-5555-555555555551",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["content_kind"] == "audio"
    assert response.json()["data"]["content_id"] == "55555555-5555-5555-5555-555555555551"
    app.dependency_overrides.clear()


def test_admin_can_list_homepage_sections(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.get("/api/v1/admin/homepage-sections", headers=_headers("11111111-1111-1111-1111-111111111111"))

    assert response.status_code == 200
    assert response.json()["data"][0]["slug"] == "hot-movies"
    app.dependency_overrides.clear()


def test_admin_can_create_homepage_section(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.admin_api_token", "test-admin-token")
    app.dependency_overrides[get_admin_repository] = override_admin_repository
    client = TestClient(app)

    response = client.post(
        "/api/v1/admin/homepage-sections",
        headers=_headers("11111111-1111-1111-1111-111111111111"),
        json={
            "title": "KDrama",
            "slug": "kdrama",
            "sort_order": 2,
            "is_active": True,
            "config": {"content_type": "series", "language": "ko", "limit": 12},
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["slug"] == "kdrama"
    app.dependency_overrides.clear()
