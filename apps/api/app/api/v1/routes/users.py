from fastapi import APIRouter

from app.schemas.responses import api_response

router = APIRouter()


@router.get("")
async def get_me():
    return api_response(data=None, meta={"source": "placeholder"})


@router.get("/points")
async def get_my_points():
    return api_response(
        data={
            "points_balance": 0,
            "transactions": [],
        },
        meta={"source": "placeholder"},
    )


@router.get("/downloads")
async def get_my_downloads():
    return api_response(data=[], meta={"source": "placeholder"})
