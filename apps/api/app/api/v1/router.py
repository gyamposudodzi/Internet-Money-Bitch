from fastapi import APIRouter

from app.api.v1.routes import admin, ads, auth, catalog, downloads, health, telegram, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(catalog.router, tags=["catalog"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/me", tags=["users"])
api_router.include_router(downloads.router, prefix="/download-sessions", tags=["downloads"])
api_router.include_router(ads.router, prefix="/ads", tags=["ads"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["telegram"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
