/**
 * Security Log Service
 * 
 * Service for logging security events such as login attempts, OTP requests,
 * failed authentications, and other security-related events.
 */

import { prisma } from '@/lib/prisma';

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  OTP_REQUEST = 'OTP_REQUEST',
  OTP_VERIFY = 'OTP_VERIFY',
  PIN_CHANGE = 'PIN_CHANGE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export interface SecurityLogData {
  userId?: string;
  phone?: string;
  ipAddress?: string;
  userAgent?: string;
  eventType: SecurityEventType;
  success: boolean;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Security Log Service
 */
export class SecurityLogService {
  /**
   * Log a security event
   */
  async logEvent(data: SecurityLogData): Promise<void> {
    try {
      // In production, you might want to use a proper logging service
      // For now, we'll use console logging and optionally store in database
      
      const logMessage = {
        timestamp: new Date().toISOString(),
        eventType: data.eventType,
        success: data.success,
        userId: data.userId || 'unknown',
        phone: data.phone || 'unknown',
        ipAddress: data.ipAddress || 'unknown',
        userAgent: data.userAgent || 'unknown',
        metadata: data.metadata || {},
        errorMessage: data.errorMessage,
      };

      // Log to console (in production, use proper logging service)
      if (data.success) {
        console.log('[SECURITY]', logMessage);
      } else {
        console.warn('[SECURITY]', logMessage);
      }

      // Optionally store in database for audit trail
      // For now, we'll just log to console to avoid database overhead
      // In production, you might want to create a SecurityLog model
    } catch (error) {
      // Don't throw errors from logging - it shouldn't break the main flow
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log login attempt
   */
  async logLoginAttempt(
    phone: string,
    success: boolean,
    userId?: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      phone,
      userId,
      eventType: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
      success,
      errorMessage,
      metadata,
    });
  }

  /**
   * Log OTP request
   */
  async logOtpRequest(
    phone: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      phone,
      eventType: SecurityEventType.OTP_REQUEST,
      success,
      errorMessage,
    });
  }

  /**
   * Log account lockout
   */
  async logAccountLocked(
    phone: string,
    userId?: string,
    reason?: string
  ): Promise<void> {
    await this.logEvent({
      phone,
      userId,
      eventType: SecurityEventType.ACCOUNT_LOCKED,
      success: false,
      metadata: { reason },
    });
  }
}

// Export singleton instance
export const securityLogService = new SecurityLogService();
