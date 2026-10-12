import uuid
from http import HTTPStatus

from fastapi import APIRouter, HTTPException

from zenalitics.schemas.outcome_filters import OutcomeCategoryTopFilter, OutcomePerDayFilter, OutcomeCategoryBreakdownFilter
from zenalitics.schemas.outcome_results import OutcomePerDayResponse, OutcomeCategoryTopResponse, OutcomeCategoryBreakdownResponse
from zenalitics.schemas.transaction_history import TransactionsHistory
from zenalitics.storage import duck_db

router = APIRouter(prefix="/api/v1/analytic", tags=["Analytics"])

@router.post("/connection")
async def create_connection(history: TransactionsHistory, ttl: int=60) -> uuid.UUID:
    try:
        return duck_db.create_connection(history, ttl)
    except duck_db.InvalidConnectionException as e:
        raise HTTPException(HTTPStatus.BAD_REQUEST, detail=str(e))


@router.post("/{connection_uuid}/outcomes/per-day")
def outcomes_per_day(connection_uuid: uuid.UUID, flt: OutcomePerDayFilter) -> OutcomePerDayResponse:
    try:
        return duck_db.outcomes_per_by_day(connection_uuid, flt)
    except duck_db.InvalidConnectionException as e:
        raise HTTPException(HTTPStatus.NOT_FOUND, detail=str(e))


@router.post("/{connection_uuid}/outcomes/categories/top")
def outcomes_category_top(connection_uuid: uuid.UUID, flt: OutcomeCategoryTopFilter) -> list[OutcomeCategoryTopResponse]:
    try:
        return duck_db.outcomes_category_top(connection_uuid, flt)
    except duck_db.InvalidConnectionException as e:
        raise HTTPException(HTTPStatus.NOT_FOUND, detail=str(e))


@router.post("/{connection_uuid}/outcomes/categories/breakdown")
def outcomes_category_breakdown(connection_uuid: uuid.UUID, flt: OutcomeCategoryBreakdownFilter) -> list[OutcomeCategoryBreakdownResponse]:
    try:
        return duck_db.outcomes_category_breakdown(connection_uuid, flt)
    except duck_db.InvalidConnectionException as e:
        raise HTTPException(HTTPStatus.NOT_FOUND, detail=str(e))

