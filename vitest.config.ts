import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Show console output from passing tests (the policy test prints per-config numbers).
    silent: false,
  },
});
