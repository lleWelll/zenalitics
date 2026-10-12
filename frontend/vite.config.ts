/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const FIXTURE = fileURLToPath(new URL('./dev-data/synthetic.csv', import.meta.url));

/** Только в dev: отдаёт синтетическую выгрузку для кнопки «Войти с тестовыми данными». В сборку не попадает. */
function devFixture(): Plugin {
  return {
    name: 'zenalitics-dev-fixture',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/synthetic.csv', (_req, res) => {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.end(readFileSync(FIXTURE));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFixture()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8888' },
  },
  build: {
    // ECharts даже урезанный до трёх типов графиков весит ~575 КБ — это осознанный отдельный чанк.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Крупные библиотеки — отдельными чанками: при обновлении приложения браузер не перекачивает их заново.
        codeSplitting: {
          groups: [
            { name: 'echarts', test: /node_modules[\\/](echarts|zrender)[\\/]/, priority: 30 },
            { name: 'mantine', test: /node_modules[\\/]@mantine[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // CSS-модули отдают в тестах настоящие имена классов (`classes.bad === 'bad'`), остальной CSS не грузится.
    css: { include: [/\.module\.css$/], modules: { classNameStrategy: 'non-scoped' } },
  },
});
