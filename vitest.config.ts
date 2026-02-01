import { defineConfig } from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
  },
});
