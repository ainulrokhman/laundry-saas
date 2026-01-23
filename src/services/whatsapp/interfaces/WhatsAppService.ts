/**
 * WhatsApp Service Interface
 * 
 * Abstract interface for WhatsApp messaging services.
 * Allows for multiple provider implementations (Fonnte, Twilio, etc.)
 */

export interface WhatsAppService {
  /**
   * Send OTP code via WhatsApp
   * @param phone - Phone number in international format (e.g., 6281234567890)
   * @param code - OTP code (6 digits)
   * @returns Promise<boolean> - true if message sent successfully
   */
  sendOtp(phone: string, code: string): Promise<boolean>;

  /**
   * Send generic message via WhatsApp
   * @param phone - Phone number in international format (e.g., 6281234567890)
   * @param message - Message content
   * @returns Promise<boolean> - true if message sent successfully
   */
  sendMessage(phone: string, message: string): Promise<boolean>;
}
