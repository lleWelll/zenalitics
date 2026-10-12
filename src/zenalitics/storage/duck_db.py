import asyncio
import uuid
from io import StringIO

import duckdb

from zenalitics.schemas.outcome_filters import OutcomeCategoryTopFilter, OutcomePerDayFilter, OutcomeCategoryBreakdownFilter
from zenalitics.schemas.outcome_results import OutcomePerDayResponse, OutcomeCategoryTopResponse, OutcomeCategoryBreakdownResponse
from zenalitics.schemas.transaction_history import TransactionsHistory

from . import sql

_connections: dict[uuid.UUID, duckdb.DuckDBPyConnection] = {}


class InvalidConnectionException(Exception):
    pass


async def _remove_connection_after_ttl(guid: uuid.UUID, ttl: int):
    if ttl < 0:
        raise InvalidConnectionException("TTL must be positive")

    await asyncio.sleep(ttl * 60)

    conn = _connections.pop(guid, None)
    if conn is not None:
        conn.close()


def create_connection(history: TransactionsHistory, ttl: int=60) -> uuid.UUID:
    csv = StringIO(history.history.decode("utf-8"))

    conn = duckdb.connect()
    conn.register("transactions", conn.read_csv(csv))
    guid = uuid.uuid4()

    _connections[guid] = conn
    _ = asyncio.create_task(_remove_connection_after_ttl(guid, ttl))
    return guid


def get_connection(connection_uuid: uuid.UUID) -> duckdb.DuckDBPyConnection:
    if connection_uuid in _connections:
        return _connections[connection_uuid]
    raise InvalidConnectionException(f"no connection with uuid: {connection_uuid}")


def outcomes_per_by_day(connection_uuid: uuid.UUID, params: OutcomePerDayFilter) -> OutcomePerDayResponse:
    conn = get_connection(connection_uuid)
    row = conn.execute(sql.OUTCOME_PER_DAY_SQL, params.model_dump()).fetchone()
    if row is None:
        raise RuntimeError("outcome_per_day query returned no rows")
    return OutcomePerDayResponse(*row)


def outcomes_category_top(connection_uuid: uuid.UUID, params: OutcomeCategoryTopFilter) -> list[OutcomeCategoryTopResponse]:
    conn = get_connection(connection_uuid)
    rows = conn.execute(sql.TOP_CATEGORIES_SQL, params.model_dump()).fetchall()
    return [OutcomeCategoryTopResponse(*row) for row in rows]


def outcomes_category_breakdown(connection_uuid: uuid.UUID, params: OutcomeCategoryBreakdownFilter) -> list[OutcomeCategoryBreakdownResponse]:
    conn = get_connection(connection_uuid)
    rows = conn.execute(sql.CATEGORY_BREAKDOWN_SQL, params.model_dump()).fetchall()
    return [OutcomeCategoryBreakdownResponse(*row) for row in rows]
