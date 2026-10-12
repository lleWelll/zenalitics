from fastapi import APIRouter

from zenalitics.routers import analytics, transactions

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(transactions.router)
api_v1.include_router(analytics.router)
