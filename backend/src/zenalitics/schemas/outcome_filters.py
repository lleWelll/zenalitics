from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DateRangeFilter(BaseModel):
    date_from: date
    date_to: date

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def check_order(self):
        if self.date_to < self.date_from:
            raise ValueError("date_from must be <= date_to")
        return self


class OutcomePerDayFilter(DateRangeFilter):
    account: str
    excluded_categories: list[str] = []


class OutcomeCategoryTopFilter(DateRangeFilter):
    accounts: list[str] = []
    top_n: int = Field(default=10, gt=0)


class OutcomeCategoryBreakdownFilter(DateRangeFilter):
    accounts: list[str] = []
    category_patterns: list[str]
