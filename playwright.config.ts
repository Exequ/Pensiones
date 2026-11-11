import { defineConfig } from '@playwright/test';

const PUERTO = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}/Pensiones/`,
    trace: 'off',
    locale: 'es-ES',
  },
  projects: [
    { name: 'escritorio', use: { viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 } },
    {
      name: 'movil',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true },
    },
  ],
  webServer: {
    // Se sirve la compilación de producción con la misma ruta base que GitHub Pages.
    command: `npm run build && npx vite preview --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}/Pensiones/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
