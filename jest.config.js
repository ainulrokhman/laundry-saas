/**
 * Jest Configuration for Next.js
 * 
 * This configuration is optimized for Next.js 16+ with TypeScript
 * Supports both unit tests and React component tests
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files after environment is set up
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test environment for React components
  testEnvironment: 'jest-environment-jsdom',
  
  // Module name mapper for path aliases (matches tsconfig.json)
  // Order matters: more specific paths first
  moduleNameMapper: {
    '^@/repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Test match patterns (exclude example files)
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Exclude example files from tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '.*\\.example\\.[jt]sx?$', // Exclude .example.ts files
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  
  // Coverage thresholds (optional - uncomment to enforce)
  // coverageThresholds: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70,
  //   },
  // },
  
  // Transform ignore patterns
  // Allow transforming ESM modules from node_modules
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|openid-client)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
