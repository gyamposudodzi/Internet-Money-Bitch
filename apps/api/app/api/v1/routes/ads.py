from fastapi import APIRouter, Depends

from app.core.database import get_db_session
from app.repositories.ads import AdRepository
from app.schemas.ads import AdCallbackResponse, AdEventResponse
from app.schemas.responses import api_response
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def get_ad_repository(session: AsyncSession = Depends(get_db_session)) -> AdRepository:
    return AdRepository(session)


@router.post("/callback/{provider}")
async def receive_ad_callback(
    provider: str,
    payload: dict,
    repository: AdRepository = Depends(get_ad_repository),
):
    result = await repository.process_callback(provider, payload)
    return api_response(
        data=AdCallbackResponse.model_validate(result.__dict__),
        meta={"received_keys": sorted(payload.keys())},
    )


@router.post("/events")
async def record_ad_event(
    payload: dict,
    repository: AdRepository = Depends(get_ad_repository),
):
    result = await repository.record_event(payload)
    return api_response(
        data=AdEventResponse.model_validate(result.__dict__),
        meta={"received_keys": sorted(payload.keys())},
    )
