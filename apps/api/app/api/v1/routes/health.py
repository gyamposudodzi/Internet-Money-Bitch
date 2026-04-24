from fastapi import APIRouter

from app.core.config import settings
from app.schemas.responses import api_response

router = APIRouter()


@router.get("/health")
async def health_check():
    return api_response(
        data={
            "status": "ok",
            "app": settings.app_name,
            "environment": settings.app_env,
        }
    )
