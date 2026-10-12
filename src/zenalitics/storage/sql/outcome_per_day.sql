-- Parameters:
--   $account              счёт
--   $date_from            начало периода (включительно)
--   $date_to              конец периода (включительно)
--   $excluded_categories  категории, которые не считаются расходами (список)
with params as (
    select
        $account::varchar               as account,
        $date_from::date                as date_from,
        $date_to::date                  as date_to,
        $excluded_categories::varchar[] as excluded_categories
),
expenses as (
    select
        t.date::date                          as d,
        replace(t.outcome, ',', '.')::numeric as amount
    from transactions t
        cross join params p
    where t.date between p.date_from and p.date_to
      and t.outcomeAccountName = p.account
      -- Поле счёта-получателя пустое, значит это расход, а не перевод на другой счёт
      and nullif(t.incomeAccountName, '') is null
      and not list_contains(p.excluded_categories, coalesce(t.categoryName, ''))
      and nullif(t.outcome, '') is not null
)
select
    sum(e.amount)                                                    as total,
    count(distinct e.d)                                              as days_with_spend,
    round(sum(e.amount) / count(distinct e.d), 2)                    as avg_per_spend_day,
    any_value(p.date_to - p.date_from + 1)                           as days_in_period,
    round(sum(e.amount) / any_value(p.date_to - p.date_from + 1), 2) as avg_per_calendar_day
from expenses e
    cross join params p;
