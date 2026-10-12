-- Топ расходов по категориям за период по счетам
-- Parameters:
--   $accounts   счета (список); пустой список = все счета
--   $date_from  начало периода (включительно)
--   $date_to    конец периода (включительно)
--   $top_n      сколько категорий показать
with params as (
    select
        $accounts::varchar[] as accounts,
        $date_from::date     as date_from,
        $date_to::date       as date_to,
        $top_n::integer      as top_n
),
expenses as (
    select
        coalesce(t.categoryName, 'Без категории')    as category,
        t.outcomeCurrencyShortTitle                  as currency,
        replace(t.outcome, ',', '.')::decimal(18, 2) as amount
    from transactions t
        cross join params p
    where t.date between p.date_from and p.date_to
      and (len(p.accounts) = 0 or list_contains(p.accounts, t.outcomeAccountName))
      and t.incomeAccountName is null                  -- расход, а не перевод
      and t.outcome is not null
      and coalesce(t.categoryName, '') <> 'Корректировка'
),
ranked as (
    select
        row_number() over (partition by currency order by sum(amount) desc)           as rank,
        category,
        currency,
        count(*)                                                                      as tx_count,
        sum(amount)                                                                   as total,
        round(avg(amount), 2)                                                         as avg_check,
        round(100.0 * sum(amount) / sum(sum(amount)) over (partition by currency), 1) as share_pct
    from expenses
    group by category, currency
)
select r.*
from ranked r
    cross join params p
where r.rank <= p.top_n
order by r.currency, r.rank;
