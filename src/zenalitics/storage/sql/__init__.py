from functools import cache
from importlib.resources import files


@cache
def load_sql(name: str) -> str:
    return (files(__name__) / f"{name}.sql").read_text(encoding="utf-8")


OUTCOME_PER_DAY_SQL = load_sql("outcome_per_day")
TOP_CATEGORIES_SQL = load_sql("outcome_category_top")
CATEGORY_BREAKDOWN_SQL = load_sql("outcome_category_breakdown")
