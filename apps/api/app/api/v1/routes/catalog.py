from fastapi import APIRouter, Depends, Query

from app.core.database import get_db_session
from app.core.errors import AppError
from app.repositories.catalog import CatalogFilters, CatalogRepository, as_media_detail, as_media_summaries
from app.repositories.platform_settings import get_platform_settings_repository, PlatformSettingsRepository
from app.schemas.platform_settings import SiteConfigPublic
from app.schemas.responses import api_response
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def get_catalog_repository(session: AsyncSession = Depends(get_db_session)) -> CatalogRepository:
    return CatalogRepository(session)


@router.get("/site-config")
async def get_public_site_config(
    settings_repo: PlatformSettingsRepository = Depends(get_platform_settings_repository),
):
    data = await settings_repo.get_settings()
    return api_response(data=SiteConfigPublic.model_validate(data))


@router.get("/home")
async def get_home(repository: CatalogRepository = Depends(get_catalog_repository)):
    home = await repository.get_home_sections()
    home["sections"] = [
        {
            **section,
            "items": as_media_summaries(section["items"]),
        }
        for section in home["sections"]
    ]
    return api_response(data=home)


@router.get("/search")
async def search_catalog(
    q: str | None = None,
    content_type: str | None = Query(default=None, alias="type"),
    genre: str | None = None,
    year: int | None = None,
    language: str | None = None,
    page: int = 1,
    limit: int = 24,
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    results = await repository.search(q, content_type, genre, year, language, page, limit)
    return api_response(
        data=as_media_summaries(results),
        meta={"q": q, "type": content_type, "genre": genre, "year": year, "language": language, "page": page, "limit": limit},
    )


@router.get("/movies")
async def list_movies(
    genre: str | None = None,
    year: int | None = None,
    language: str | None = None,
    sort: str = "latest",
    page: int = 1,
    limit: int = 24,
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    movies = await repository.list_movies(
        CatalogFilters(
            genre=genre,
            year=year,
            language=language,
            sort=sort,
            page=page,
            limit=limit,
        )
    )
    return api_response(
        data=as_media_summaries(movies),
        meta={"genre": genre, "year": year, "language": language, "sort": sort, "page": page, "limit": limit},
    )


@router.get("/movies/{slug}")
async def get_movie(slug: str, repository: CatalogRepository = Depends(get_catalog_repository)):
    movie = await repository.get_movie(slug)
    if movie is None:
        raise AppError(code="movie_not_found", message="Movie not found.", status_code=404)
    return api_response(data=as_media_detail(movie))


@router.get("/series")
async def list_series(
    q: str | None = None,
    language: str | None = None,
    sort: str = "latest",
    page: int = 1,
    limit: int = 24,
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    series_items = await repository.list_series(
        q=q,
        language=language,
        sort=sort,
        page=page,
        limit=limit,
    )
    return api_response(
        data=as_media_summaries(series_items),
        meta={"q": q, "language": language, "sort": sort, "page": page, "limit": limit},
    )


@router.get("/series/{slug}")
async def get_series(slug: str, repository: CatalogRepository = Depends(get_catalog_repository)):
    series_item = await repository.get_series(slug)
    if series_item is None:
        raise AppError(code="series_not_found", message="Series not found.", status_code=404)
    return api_response(data=as_media_detail(series_item))


@router.get("/audio")
async def list_audio(
    artist: str | None = None,
    album: str | None = None,
    language: str | None = None,
    sort: str = "latest",
    page: int = 1,
    limit: int = 24,
    repository: CatalogRepository = Depends(get_catalog_repository),
):
    audio_items = await repository.list_audio(
        artist=artist,
        album=album,
        language=language,
        sort=sort,
        page=page,
        limit=limit,
    )
    return api_response(
        data=as_media_summaries(audio_items),
        meta={"artist": artist, "album": album, "language": language, "sort": sort, "page": page, "limit": limit},
    )


@router.get("/audio/{slug}")
async def get_audio(slug: str, repository: CatalogRepository = Depends(get_catalog_repository)):
    audio_item = await repository.get_audio(slug)
    if audio_item is None:
        raise AppError(code="audio_not_found", message="Audio item not found.", status_code=404)
    return api_response(data=as_media_detail(audio_item))
