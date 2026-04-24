from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient

from app.api.v1.routes.catalog import get_catalog_repository
from app.main import app


class StubCatalogRepository:
    async def get_home_sections(self) -> dict:
        return {
            "sections": [
                {
                    "key": "featured-movies",
                    "title": "Featured Movies",
                    "items": [
                        {
                            "id": "movie-1",
                            "title": "Heatline",
                            "slug": "heatline",
                            "poster_url": "https://example.com/poster.jpg",
                            "release_year": 2026,
                            "content_type": "movie",
                        }
                    ],
                }
            ],
            "ad_slots": [{"key": "detail-inline", "title": "Detail Inline", "location": "movie_detail"}],
        }

    async def search(self, q, content_type, genre, year, language, page, limit) -> list[dict]:
        return [
            {
                "id": "movie-1",
                "title": "Heatline",
                "slug": "heatline",
                "poster_url": "https://example.com/poster.jpg",
                "release_year": 2026,
                "content_type": content_type or "movie",
            }
        ]

    async def list_movies(self, filters) -> list[dict]:
        return [
            {
                "id": "movie-1",
                "title": "Heatline",
                "slug": "heatline",
                "poster_url": "https://example.com/poster.jpg",
                "release_year": 2026,
                "content_type": "movie",
            }
        ]

    async def get_movie(self, slug: str) -> dict | None:
        if slug != "heatline":
            return None
        return {
            "id": "movie-1",
            "title": "Heatline",
            "slug": "heatline",
            "poster_url": "https://example.com/poster.jpg",
            "backdrop_url": "https://example.com/backdrop.jpg",
            "synopsis": "A test film.",
            "release_year": 2026,
            "language": "en",
            "content_type": "movie",
            "files": [
                {
                    "id": "file-1",
                    "label": "1080p",
                    "quality": "1080p",
                    "format": "mp4",
                    "file_size_bytes": 1024,
                    "requires_ad": True,
                    "points_cost": 15,
                }
            ],
        }

    async def list_series(self, page: int, limit: int) -> list[dict]:
        return []

    async def get_series(self, slug: str) -> dict | None:
        return None

    async def list_audio(self, artist, album, language, sort, page, limit) -> list[dict]:
        return [
            {
                "id": "audio-1",
                "title": "Night Drive",
                "slug": "night-drive",
                "poster_url": "https://example.com/cover.jpg",
                "release_year": None,
                "content_type": "audio",
            }
        ]

    async def get_audio(self, slug: str) -> dict | None:
        if slug != "night-drive":
            return None
        return {
            "id": "audio-1",
            "title": "Night Drive",
            "slug": "night-drive",
            "poster_url": "https://example.com/cover.jpg",
            "backdrop_url": None,
            "synopsis": "A test track.",
            "release_year": None,
            "language": "en",
            "content_type": "audio",
            "files": [],
        }


async def override_catalog_repository() -> AsyncGenerator[StubCatalogRepository, None]:
    yield StubCatalogRepository()


def test_home_uses_repository_sections():
    app.dependency_overrides[get_catalog_repository] = override_catalog_repository
    client = TestClient(app)

    response = client.get("/api/v1/home")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["sections"][0]["key"] == "featured-movies"
    assert payload["data"]["sections"][0]["items"][0]["slug"] == "heatline"
    app.dependency_overrides.clear()


def test_get_movie_returns_files():
    app.dependency_overrides[get_catalog_repository] = override_catalog_repository
    client = TestClient(app)

    response = client.get("/api/v1/movies/heatline")

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["slug"] == "heatline"
    assert payload["data"]["files"][0]["quality"] == "1080p"
    app.dependency_overrides.clear()


def test_get_movie_returns_404_when_missing():
    app.dependency_overrides[get_catalog_repository] = override_catalog_repository
    client = TestClient(app)

    response = client.get("/api/v1/movies/missing-title")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "movie_not_found"
    app.dependency_overrides.clear()
