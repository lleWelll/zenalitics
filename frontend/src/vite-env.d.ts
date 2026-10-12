/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Сколько аналитических запросов слать параллельно. 1 — пока в бэке гонка на общем соединении DuckDB. */
  readonly VITE_API_CONCURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
