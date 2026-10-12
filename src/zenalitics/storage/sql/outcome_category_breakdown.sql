-- Расходы по категориям
-- Parameters:
--   $accounts            счета (список); пустой список = все счета
--   $category_patterns   шаблоны ilike (список): 'Мерей%' = Мерей и все подкатегории,
--                        '%кофе%' = всё с "кофе"
--   $date_from           начало периода (включительно)
--   $date_to             конец периода (включительно)
with params as (
    select
        $accounts::varchar[]          as accounts,
        $category_patterns::varchar[] as category_patterns,
        $date_from::date              as date_from,
        $date_to::date                as date_to
),
expenses as (
    select
        t.categoryName                               as category,
        t.outcomeCurrencyShortTitle                  as currency,
        replace(t.outcome, ',', '.')::decimal(18, 2) as amount
    from transactions t
        cross join params p
    where t.date between p.date_from and p.date_to
      and (len(p.accounts) = 0 or list_contains(p.accounts, t.outcomeAccountName))
      and exists (                                     -- категория подходит хотя бы под один шаблон
        select 1
        from unnest(p.category_patterns) as u(pattern)
        where t.categoryName ilike u.pattern
      )
      and t.incomeAccountName is null                  -- расход, а не перевод
      and t.outcome is not null
)
select
    currency,
    coalesce(category, '= ИТОГО') as category,
    count(*)                      as tx_count,
    sum(amount)                   as total
from expenses
group by grouping sets ((currency, category), (currency))
order by currency, grouping(category), total desc;
