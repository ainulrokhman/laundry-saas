/**
 * Fonnte WhatsApp Service Implementation
 * 
 * Integration with Fonnte API for sending WhatsApp messages.
 * Documentation: https://fonnte.com/docs
 */

import axios, { AxiosError } from 'axios';
import { WhatsAppService } from '../interfaces/WhatsAppService';

export class FonnteWhatsAppService implements WhatsAppService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    const apiKey = process.env.FONNTE_API_KEY;
    const apiUrl = process.env.FONNTE_API_URL || 'https://api.fonnte.com';

    if (!apiKey) {
      throw new Error('FONNTE_API_KEY is not configured in environment variables');
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Format phone number to international format (remove +, spaces, dashes)
   * @param phone - Phone number in any format
   * @returns Formatted phone number (e.g., 6281234567890)
   */
  private formatPhone(phone: string): string {
    return phone.replace(/[\s+\-()]/g, '');
  }

  /**
   * Generate OTP message template
   * @param code - OTP code
   * @returns Formatted OTP message
   */
  private getOtpMessage(code: string): string {
    return `Kode OTP Anda: *${code}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.\n\nJika Anda tidak meminta kode ini, abaikan pesan ini.`;
  }

  /**
   * Send OTP code via WhatsApp using Fonnte API
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhone(phone);
      const message = this.getOtpMessage(code);

      const response = await axios.post(
        `${this.apiUrl}/send`,
        {
          target: formattedPhone,
          message: message,
        },
        {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      // Fonnte API returns status in response
      if (response.data?.status === true || response.status === 200) {
        return true;
      }

      console.error('Fonnte API error:', response.data);
      return false;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Fonnte API request failed:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('Unexpected error sending OTP:', error);
      }
      return false;
    }
  }

  /**
   * Send generic message via WhatsApp using Fonnte API
   */
  async sendMessage(phone: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhone(phone);

      const response = await axios.post(
        `${this.apiUrl}/send`,
        {
          target: formattedPhone,
          message: message,
        },
        {
          headers: {
            Authorization: this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout
        }
      );

      // Fonnte API returns status in response
      if (response.data?.status === true || response.status === 200) {
        return true;
      }

      console.error('Fonnte API error:', response.data);
      return false;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Fonnte API request failed:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('Unexpected error sending message:', error);
      }
      return false;
    }
  }
}
