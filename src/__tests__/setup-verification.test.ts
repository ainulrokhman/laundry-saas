/**
 * Setup Verification Test
 * 
 * This test file verifies that the testing framework is properly configured.
 * Run this test first to ensure everything is working:
 * 
 * npm test -- setup-verification.test.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('Testing Framework Setup Verification', () => {
  describe('Basic Jest Functionality', () => {
    it('should run tests successfully', () => {
      expect(true).toBe(true);
    });

    it('should support basic assertions', () => {
      expect(1 + 1).toBe(2);
      expect('hello').toBe('hello');
      expect([1, 2, 3]).toHaveLength(3);
    });

    it('should support async/await', async () => {
      const promise = Promise.resolve('test');
      const result = await promise;
      expect(result).toBe('test');
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript types', () => {
      const number: number = 42;
      const string: string = 'test';
      
      expect(typeof number).toBe('number');
      expect(typeof string).toBe('string');
    });

    it('should support TypeScript interfaces', () => {
      interface TestInterface {
        id: string;
        name: string;
      }

      const obj: TestInterface = {
        id: '1',
        name: 'test',
      };

      expect(obj.id).toBe('1');
      expect(obj.name).toBe('test');
    });
  });

  describe('Path Aliases', () => {
    it('should resolve @/types paths', () => {
      // This test verifies that path aliases work
      // If this fails, check jest.config.js moduleNameMapper
      const { Role } = require('@/types/enums/Role');
      expect(Role).toBeDefined();
      expect(Role.OWNER).toBe('OWNER');
      expect(Role.STAFF).toBe('STAFF');
      expect(Role.SUPERADMIN).toBe('SUPERADMIN');
    });
  });

  describe('Environment Variables', () => {
    it('should have test environment variables', () => {
      expect(process.env.NEXTAUTH_SECRET).toBeDefined();
      expect(process.env.NEXTAUTH_URL).toBeDefined();
    });
  });
});
