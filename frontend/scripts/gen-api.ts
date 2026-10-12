// Генерирует src/api/schema.d.ts из OpenAPI бэкенда. Сервер запускать не нужно — схема берётся прямо из FastAPI-приложения.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dump = 'import json; from zenalitics.main import app; print(json.dumps(app.openapi()))';
const spec = execFileSync('uv', ['run', '--quiet', '--directory', '../backend', 'python', '-c', dump], { encoding: 'utf8' });
const file = join(mkdtempSync(join(tmpdir(), 'zenalitics-')), 'openapi.json');
writeFileSync(file, spec);
execFileSync('npx', ['openapi-typescript', file, '--output', 'src/api/schema.d.ts'], { stdio: 'inherit' });
