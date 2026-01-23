/**
 * WhatsApp Service Factory
 * 
 * Factory pattern for creating WhatsApp service instances.
 * Currently supports Fonnte, but can be extended for other providers.
 */

import { WhatsAppService } from './interfaces/WhatsAppService';
import { FonnteWhatsAppService } from './providers/FonnteWhatsAppService';

export type WhatsAppProvider = 'fonnte';

/**
 * Create WhatsApp service instance based on provider
 * @param provider - Provider name (default: 'fonnte')
 * @returns WhatsAppService instance
 */
export function createWhatsAppService(provider: WhatsAppProvider = 'fonnte'): WhatsAppService {
  switch (provider) {
    case 'fonnte':
      return new FonnteWhatsAppService();
    default:
      throw new Error(`Unsupported WhatsApp provider: ${provider}`);
  }
}

/**
 * Get default WhatsApp service instance
 * Uses provider from environment variable or defaults to 'fonnte'
 */
export function getWhatsAppService(): WhatsAppService {
  const provider = (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) || 'fonnte';
  return createWhatsAppService(provider);
}
