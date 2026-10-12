from dataclasses import dataclass


@dataclass()
class OutcomePerDayResponse:
    total: float | None
    days_with_spend: int
    avg_per_spend_day: float | None
    days_in_period: int | None
    avg_per_calendar_day: float | None

@dataclass()
class OutcomeCategoryTopResponse:
    rank: int
    category: str
    currency: str
    tx_count: int
    total: float
    avg_check: float
    share_pct: float

@dataclass()
class OutcomeCategoryBreakdownResponse:
    currency: str
    category: str
    tx_count: int
    total: float
