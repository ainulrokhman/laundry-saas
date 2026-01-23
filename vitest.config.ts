import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration
 * 
 * Vitest is used for:
 * - Unit tests (repositories, services, utilities)
 * - Component tests (React components with Testing Library)
 * - Integration tests (API routes, database operations)
 */

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'happy-dom', // For React component testing (more compatible than jsdom)
    
    // Setup files
    setupFiles: ['./__tests__/setup.ts'],
    
    // Glob patterns for test files
    include: [
      '**/__tests__/**/*.{test,spec}.{js,ts,tsx}',
      '**/*.{test,spec}.{js,ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',
      '**/playwright/**',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/generated/**',
        '**/e2e/**',
        '**/playwright/**',
      ],
    },
    
    // Global test timeout
    testTimeout: 10000,
    
    // Mock configuration
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
