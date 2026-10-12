import time
from http import HTTPStatus
from typing import Final

from fastapi import APIRouter, HTTPException, Response

from zenalitics.schemas.transaction_history import TransactionsHistory

from ..exporter import exporter
from ..schemas.user_credentials import UserCredentials

router = APIRouter(prefix="/api/v1/transactions", tags=["Transaction"])

CSV_FILE_NAME_TEMPL: Final[str] = "exported-transaction-{now}.csv"
TIME_FORMAT: Final[str]         = "%Y-%m-%dT%H-%M-%S"

@router.post("/export")
def export_history(creds: UserCredentials) -> Response:
    try:
        data = exporter.export_data(creds)
    except exporter.LoginException as e:
        raise HTTPException(HTTPStatus.BAD_REQUEST, str(e))

    filename = CSV_FILE_NAME_TEMPL.format(now=time.strftime(TIME_FORMAT))
    return Response(
        content=data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.post("/export/raw")
def export_history_raw(creds: UserCredentials) -> TransactionsHistory:
    try:
        data = exporter.export_data(creds)
    except exporter.LoginException as e:
        raise HTTPException(HTTPStatus.BAD_REQUEST, str(e))

    return TransactionsHistory(history=data)

