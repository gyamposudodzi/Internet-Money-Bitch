from fastapi import APIRouter, Depends

from app.core.database import get_db_session
from app.core.errors import AppError
from app.repositories.downloads import DownloadRepository, validate_uuid
from app.schemas.downloads import CreateDownloadSessionRequest, DownloadSessionResponse
from app.schemas.responses import api_response
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def get_download_repository(session: AsyncSession = Depends(get_db_session)) -> DownloadRepository:
    return DownloadRepository(session)


@router.post("")
async def create_download_session(
    payload: CreateDownloadSessionRequest,
    repository: DownloadRepository = Depends(get_download_repository),
):
    content_file_id = validate_uuid(payload.content_file_id, field_name="content_file_id")
    user_id = validate_uuid(payload.user_id, field_name="user_id")
    session = await repository.create_session(
        content_file_id=content_file_id,
        consume_points=payload.consume_points,
        user_id=user_id,
    )
    return api_response(data=DownloadSessionResponse.model_validate(session.__dict__))


@router.get("/{session_id}")
async def get_download_session(
    session_id: str,
    repository: DownloadRepository = Depends(get_download_repository),
):
    session = await repository.get_session(validate_uuid(session_id, field_name="session_id"))
    if session is None:
        raise AppError(
            code="download_session_not_found",
            message="Download session not found.",
            status_code=404,
        )
    return api_response(data=DownloadSessionResponse.model_validate(session.__dict__))


@router.post("/{session_id}/use-points")
async def use_points_for_session(
    session_id: str,
    user_id: str,
    repository: DownloadRepository = Depends(get_download_repository),
):
    updated_session = await repository.use_points(
        validate_uuid(session_id, field_name="session_id"),
        validate_uuid(user_id, field_name="user_id"),
    )
    return api_response(data=DownloadSessionResponse.model_validate(updated_session.__dict__))


@router.post("/{session_id}/cancel")
async def cancel_download_session(
    session_id: str,
    repository: DownloadRepository = Depends(get_download_repository),
):
    cancelled = await repository.cancel_session(validate_uuid(session_id, field_name="session_id"))
    if cancelled is None:
        raise AppError(
            code="download_session_not_found",
            message="Download session not found.",
            status_code=404,
        )
    return api_response(data=DownloadSessionResponse.model_validate(cancelled.__dict__))
