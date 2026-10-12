# zenalitics

Аналитика расходов из ZenMoney: входишь логином ZenMoney и смотришь дашборды с провалом «период → категория → подкатегория → день».

- `backend/` — FastAPI + DuckDB: выгрузка из ZenMoney, сессии, аналитические запросы.
- `frontend/` — React-приложение с дашбордами.

## Разработка

Нужны `uv` и Node 24+.

```bash
cd backend && uv run uvicorn zenalitics.main:app --port 8888 --reload
cd frontend && npm install && npm run dev   # http://127.0.0.1:5173
```

В dev на экране входа есть кнопка «Войти с тестовыми данными»: синтетическая выгрузка в формате ZenMoney. `npm run fixture` пересоздаёт её до сегодняшнего дня.

## Деплой

```bash
docker compose up -d --build   # сайт на :8080
```

nginx отдаёт фронт и проксирует `/api/` в бэк. Через сайт идёт пароль ZenMoney, поэтому наружу — только за HTTPS (TLS на вашем reverse proxy). Бэк работает одним процессом: сессии DuckDB живут в памяти.

## Проверки

```bash
cd frontend
npm test            # юнит- и компонентные тесты
npm run smoke       # бэк принимает выгрузку и отвечает (бэк должен быть запущен)
```

## Контракт API

Типы фронта генерируются из OpenAPI бэка: `cd frontend && npm run gen:api`. Все пути API — в `frontend/src/api/endpoints.ts`.

## Известные проблемы бэка

Фронт их обходит, но лучше починить:

| Проблема | Где | Как починить | Что поменять во фронте |
|---|---|---|---|
| Пути продублированы: `/api/v1/api/v1/...` | `routers/__init__.py` и `prefix` роутеров | убрать `/api/v1` из `prefix` роутеров | `npm run gen:api`, поправить `PATHS` в `src/api/endpoints.ts` |
| Параллельные запросы к одной сессии дают 500 и чужие данные: одно соединение DuckDB на все потоки | `storage/duck_db.py` | `conn.cursor()` на каждый запрос | поднять `VITE_API_CONCURRENCY` до 4–6 в `docker-compose.yml`; пока это не сделано, очередь не прерывает уже начатые запросы и держит общий замок между вкладками |
| `replace(outcome, ',', '.')` падает, если в выгрузке все суммы целые или с точкой | все `.sql` | `read_csv(..., types={'outcome': 'VARCHAR', 'income': 'VARCHAR'})` | — |
| CSV перечитывается на каждый запрос | `create_connection` | `create table transactions as select * from read_csv(...)` | — |
| `FetchException` не перехватывается → 500 при входе | `routers/transactions.py` | ловить и отдавать 502 | — |
| В трёх запросах разные определения расхода | `.sql` | общий CTE `expenses` | — |
