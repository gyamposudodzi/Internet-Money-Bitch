from fastapi import Depends, Header

from app.core.config import settings
from app.core.errors import AppError


def require_admin_token(authorization: str | None = Header(default=None)) -> str:
    if not settings.admin_api_token:
        raise AppError(
            code="admin_auth_not_configured",
            message="ADMIN_API_TOKEN is not configured.",
            status_code=503,
        )

    if not authorization:
        raise AppError(
            code="admin_authorization_missing",
            message="Authorization header is required.",
            status_code=401,
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError(
            code="admin_authorization_invalid",
            message="Authorization must use Bearer token format.",
            status_code=401,
        )

    if token != settings.admin_api_token:
        raise AppError(
            code="admin_authorization_invalid",
            message="Invalid admin token.",
            status_code=401,
        )

    return token


def require_admin_user_header(
    _: str = Depends(require_admin_token),
    x_admin_user_id: str | None = Header(default=None, alias="X-Admin-User-Id"),
) -> str:
    if not x_admin_user_id:
        raise AppError(
            code="admin_user_id_missing",
            message="X-Admin-User-Id header is required.",
            status_code=400,
        )
    return x_admin_user_id
