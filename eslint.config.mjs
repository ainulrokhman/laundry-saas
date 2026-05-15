import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

// Next.js 16+ ships flat config presets via eslint-config-next/*
// This replaces legacy `.eslintrc.json` extends:
// - "next/core-web-vitals"
// - "next/typescript"
const config = [
  // Global ignores (match old next lint behavior: don't lint build artifacts, assets, generated code, tests)
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/public/**',
      '**/src/generated/**',
      '**/__tests__/**',
      '**/e2e/**',
      '**/playwright-report/**',
      '**/scratch/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  // Project baseline: keep lint actionable (avoid blocking on legacy any/React rules for now)
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  // Config files often use require() or different patterns
  {
    files: [
      'playwright.config.ts',
      '**/*.{config,conf}.{js,ts,mjs,cjs}',
      '**/scripts/**/*.{js,ts}',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default config;

