from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import require_admin_user_header
from app.repositories.admin import AdminRepository
from app.repositories.downloads import validate_uuid
from app.schemas.admin import AdminIdentityResponse, AdminOverviewResponse, AdminUserSummary
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
