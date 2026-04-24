from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiError(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel, Generic[T]):
    data: T | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    error: ApiError | None = None


def api_response(
    data: Any | None = None,
    meta: dict[str, Any] | None = None,
    error: ApiError | None = None,
) -> ApiResponse[Any]:
    return ApiResponse(data=data, meta=meta or {}, error=error)
