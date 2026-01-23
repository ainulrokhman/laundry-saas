/**
 * Security Log Service Tests
 * 
 * Tests for security event logging functionality.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  securityLogService,
  SecurityEventType,
} from '@/services/security/SecurityLogService';

describe('Security Log Service', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logEvent', () => {
    it('should log successful events to console.log', async () => {
      await securityLogService.logEvent({
        eventType: SecurityEventType.LOGIN_SUCCESS,
        success: true,
        phone: '6281234567890',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.LOGIN_SUCCESS);
      expect(logCall.success).toBe(true);
    });

    it('should log failed events to console.warn', async () => {
      await securityLogService.logEvent({
        eventType: SecurityEventType.LOGIN_FAILURE,
        success: false,
        phone: '6281234567890',
        errorMessage: 'Invalid PIN',
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.LOGIN_FAILURE);
      expect(logCall.success).toBe(false);
      expect(logCall.errorMessage).toBe('Invalid PIN');
    });

    it('should include all provided metadata', async () => {
      const metadata = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };
      
      await securityLogService.logEvent({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        success: false,
        phone: '6281234567890',
        metadata,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][1];
      expect(logCall.metadata).toEqual(metadata);
    });

    it('should not throw errors on logging failure', async () => {
      // Force an error by making console.log throw
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      await expect(
        securityLogService.logEvent({
          eventType: SecurityEventType.LOGIN_SUCCESS,
          success: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('logLoginAttempt', () => {
    it('should log successful login', async () => {
      await securityLogService.logLoginAttempt(
        '6281234567890',
        true,
        'user-id-123'
      );

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.LOGIN_SUCCESS);
      expect(logCall.phone).toBe('6281234567890');
      expect(logCall.userId).toBe('user-id-123');
    });

    it('should log failed login with error message', async () => {
      await securityLogService.logLoginAttempt(
        '6281234567890',
        false,
        undefined,
        'Invalid PIN'
      );

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.LOGIN_FAILURE);
      expect(logCall.errorMessage).toBe('Invalid PIN');
    });

    it('should include metadata in login logs', async () => {
      const metadata = { ipAddress: '127.0.0.1' };
      
      await securityLogService.logLoginAttempt(
        '6281234567890',
        true,
        'user-id-123',
        undefined,
        metadata
      );

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][1];
      expect(logCall.metadata).toEqual(metadata);
    });
  });

  describe('logOtpRequest', () => {
    it('should log successful OTP request', async () => {
      await securityLogService.logOtpRequest('6281234567890', true);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.OTP_REQUEST);
      expect(logCall.success).toBe(true);
    });

    it('should log failed OTP request with error', async () => {
      await securityLogService.logOtpRequest(
        '6281234567890',
        false,
        'Rate limit exceeded'
      );

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.OTP_REQUEST);
      expect(logCall.success).toBe(false);
      expect(logCall.errorMessage).toBe('Rate limit exceeded');
    });
  });

  describe('logAccountLocked', () => {
    it('should log account lockout event', async () => {
      await securityLogService.logAccountLocked(
        '6281234567890',
        'user-id-123',
        'Maximum failed attempts reached'
      );

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logCall = consoleWarnSpy.mock.calls[0][1];
      expect(logCall.eventType).toBe(SecurityEventType.ACCOUNT_LOCKED);
      expect(logCall.success).toBe(false);
      expect(logCall.metadata?.reason).toBe('Maximum failed attempts reached');
    });
  });
});
