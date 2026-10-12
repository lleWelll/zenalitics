export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`HTTP ${status}${detail ? `: ${detail}` : ''}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/** 404 от аналитики: сессии на бэке больше нет (истёк TTL или бэк перезапустили). */
export class SessionExpiredError extends ApiError {
  constructor(detail: string) {
    super(404, detail);
    this.name = 'SessionExpiredError';
  }
}

export const isAbortError = (e: unknown): boolean =>
  (e instanceof DOMException || e instanceof Error) && e.name === 'AbortError';

/** Текст ошибки из тела ответа FastAPI: `{"detail": "..."}` или валидационный массив. */
export function detailOf(body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }
  return typeof body === 'string' ? body : '';
}
