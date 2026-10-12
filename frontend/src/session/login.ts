import type { Endpoints } from '../api/endpoints';
import { ApiError } from '../api/errors';
import { CsvFormatError, extractDictionaries, normalizeCsv, type Dictionaries } from './dictionaries';
import { SESSION_TTL_MINUTES, saveSession, type Session } from './store';

export type LoginStep = 'export' | 'parse' | 'connect';
export type LoginErrorKind = 'credentials' | 'zenmoney' | 'network' | 'format';

export const LOGIN_MESSAGES: Record<LoginErrorKind, string> = {
  credentials: 'Неверный логин или пароль ZenMoney.',
  zenmoney: 'ZenMoney не отдал выгрузку. Попробуй ещё раз через минуту.',
  network: 'Сервер недоступен. Проверь подключение и попробуй ещё раз.',
  format: 'Не получилось разобрать выгрузку ZenMoney.',
};

export class LoginError extends Error {
  readonly kind: LoginErrorKind;

  constructor(kind: LoginErrorKind, message: string = LOGIN_MESSAGES[kind]) {
    super(message);
    this.name = 'LoginError';
    this.kind = kind;
  }
}

type LoginApi = Pick<Endpoints, 'exportCsv' | 'createConnection'>;

function toLoginError(error: unknown, stage: 'export' | 'connect'): LoginError {
  if (error instanceof LoginError) return error;
  if (error instanceof CsvFormatError) return new LoginError('format', `${LOGIN_MESSAGES.format} ${error.message}.`);
  if (error instanceof ApiError) {
    if (stage === 'export') return new LoginError(error.status === 400 ? 'credentials' : 'zenmoney');
    return new LoginError('format', `${LOGIN_MESSAGES.format} Сервер ответил: ${error.detail || error.status}.`);
  }
  return new LoginError('network');
}

/** CSV → справочники → сессия бэка. Общий путь для входа в ZenMoney и тестовых данных. */
export async function startSession(api: LoginApi, rawCsv: string, onStep: (step: LoginStep) => void): Promise<Session> {
  const csv = normalizeCsv(rawCsv);
  onStep('parse');
  let dictionaries: Dictionaries;
  try {
    dictionaries = extractDictionaries(csv);
  } catch (error) {
    throw toLoginError(error, 'connect');
  }
  onStep('connect');
  let uuid: string;
  try {
    uuid = await api.createConnection(csv, SESSION_TTL_MINUTES);
  } catch (error) {
    throw toLoginError(error, 'connect');
  }
  // Минута запаса: истекаем на фронте чуть раньше, чем бэк закроет сессию.
  const loadedAt = Date.now();
  const session: Session = { uuid, loadedAt, expiresAt: loadedAt + (SESSION_TTL_MINUTES - 1) * 60_000, dictionaries };
  saveSession(session);
  return session;
}

export async function loginWithZenMoney(api: LoginApi, creds: { login: string; password: string }, onStep: (step: LoginStep) => void): Promise<Session> {
  onStep('export');
  let csv: string;
  try {
    csv = await api.exportCsv(creds);
  } catch (error) {
    throw toLoginError(error, 'export');
  }
  return startSession(api, csv, onStep);
}
