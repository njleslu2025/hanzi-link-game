import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const processEnv = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;

function resolveBasePath(): string {
  const repository = processEnv?.GITHUB_REPOSITORY?.split('/')[1];

  if (!repository || processEnv?.GITHUB_ACTIONS !== 'true') {
    return '/';
  }

  return repository.endsWith('.github.io') ? '/' : `/${repository}/`;
}

export default defineConfig({
  base: resolveBasePath(),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
