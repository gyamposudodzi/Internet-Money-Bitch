from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.errors import AppError


engine = create_async_engine(settings.database_url, pool_pre_ping=True) if settings.database_url else None
SessionLocal = async_sessionmaker(engine, expire_on_commit=False) if engine else None


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise AppError(
            code="database_not_configured",
            message="DATABASE_URL is not configured.",
            status_code=503,
        )

    async with SessionLocal() as session:
        yield session
