from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.errors import AppError
from app.core.security import require_admin_user_header
from app.repositories.admin import AdminRepository
from app.repositories.downloads import validate_uuid
from app.schemas.admin import (
    AdminAudioCreateRequest,
    AdminAudioUpdateRequest,
    AdminAudioSummary,
    AdminContentFileCreateRequest,
    AdminContentFileUpdateRequest,
    AdminContentFileSummary,
    AdminIdentityResponse,
    AdminMovieCreateRequest,
    AdminMovieUpdateRequest,
    AdminMovieSummary,
    AdminOverviewResponse,
    AdminUserSummary,
)
from app.schemas.responses import api_response

router = APIRouter()


def get_admin_repository(session: AsyncSession = Depends(get_db_session)) -> AdminRepository:
    return AdminRepository(session)


async def get_current_admin_identity(
    user_id: str = Depends(require_admin_user_header),
    repository: AdminRepository = Depends(get_admin_repository),
):
    return await repository.get_admin_identity(validate_uuid(user_id, field_name="X-Admin-User-Id"))


@router.get("/auth/me")
async def get_admin_me(identity=Depends(get_current_admin_identity)):
    return api_response(data=AdminIdentityResponse.model_validate(identity.__dict__))


@router.get("/analytics/overview")
async def get_admin_overview(
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    if not identity.can_view_analytics:
        from app.core.errors import AppError

        raise AppError(
            code="admin_permission_denied",
            message="This admin cannot view analytics.",
            status_code=403,
        )
    overview = await repository.get_overview()
    return api_response(data=AdminOverviewResponse.model_validate(overview))


@router.get("/users")
async def list_admin_users(
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    if not identity.can_manage_users:
        from app.core.errors import AppError

        raise AppError(
            code="admin_permission_denied",
            message="This admin cannot manage users.",
            status_code=403,
    )
    admins = await repository.list_admin_users()
    return api_response(data=[AdminUserSummary.model_validate(row) for row in admins])


def ensure_can_manage_content(identity) -> None:
    if not identity.can_manage_content:
        raise AppError(
            code="admin_permission_denied",
            message="This admin cannot manage content.",
            status_code=403,
        )


@router.get("/movies")
async def list_movies(
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    movies = await repository.list_movies()
    return api_response(data=[AdminMovieSummary.model_validate(row) for row in movies])


@router.post("/movies")
async def create_movie(
    payload: AdminMovieCreateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    movie = await repository.create_movie(payload.model_dump(), identity.user_id)
    return api_response(data=AdminMovieSummary.model_validate(movie))


@router.patch("/movies/{movie_id}")
async def update_movie(
    movie_id: str,
    payload: AdminMovieUpdateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    movie = await repository.update_movie(
        validate_uuid(movie_id, field_name="movie_id"),
        payload.model_dump(exclude_none=True),
    )
    return api_response(data=AdminMovieSummary.model_validate(movie))


@router.delete("/movies/{movie_id}")
async def archive_movie(
    movie_id: str,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    movie = await repository.archive_movie(validate_uuid(movie_id, field_name="movie_id"))
    return api_response(data=AdminMovieSummary.model_validate(movie))


@router.get("/audio")
async def list_audio(
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    items = await repository.list_audio()
    return api_response(data=[AdminAudioSummary.model_validate(row) for row in items])


@router.post("/audio")
async def create_audio(
    payload: AdminAudioCreateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    audio = await repository.create_audio(payload.model_dump(), identity.user_id)
    return api_response(data=AdminAudioSummary.model_validate(audio))


@router.patch("/audio/{audio_id}")
async def update_audio(
    audio_id: str,
    payload: AdminAudioUpdateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    audio = await repository.update_audio(
        validate_uuid(audio_id, field_name="audio_id"),
        payload.model_dump(exclude_none=True),
    )
    return api_response(data=AdminAudioSummary.model_validate(audio))


@router.delete("/audio/{audio_id}")
async def archive_audio(
    audio_id: str,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    audio = await repository.archive_audio(validate_uuid(audio_id, field_name="audio_id"))
    return api_response(data=AdminAudioSummary.model_validate(audio))


@router.get("/content-files")
async def list_content_files(
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    files = await repository.list_content_files()
    return api_response(data=[AdminContentFileSummary.model_validate(row) for row in files])


@router.post("/content-files")
async def create_content_file(
    payload: AdminContentFileCreateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    content_payload = payload.model_dump()
    content_payload["content_id"] = validate_uuid(content_payload["content_id"], field_name="content_id")
    content_file = await repository.create_content_file(content_payload, identity.user_id)
    return api_response(data=AdminContentFileSummary.model_validate(content_file))


@router.patch("/content-files/{content_file_id}")
async def update_content_file(
    content_file_id: str,
    payload: AdminContentFileUpdateRequest,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    content_file = await repository.update_content_file(
        validate_uuid(content_file_id, field_name="content_file_id"),
        payload.model_dump(exclude_none=True),
    )
    return api_response(data=AdminContentFileSummary.model_validate(content_file))


@router.delete("/content-files/{content_file_id}")
async def deactivate_content_file(
    content_file_id: str,
    identity=Depends(get_current_admin_identity),
    repository: AdminRepository = Depends(get_admin_repository),
):
    ensure_can_manage_content(identity)
    content_file = await repository.deactivate_content_file(
        validate_uuid(content_file_id, field_name="content_file_id")
    )
    return api_response(data=AdminContentFileSummary.model_validate(content_file))
