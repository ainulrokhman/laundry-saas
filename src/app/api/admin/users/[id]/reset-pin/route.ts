/**
 * Admin Reset PIN API Route
 *
 * POST /api/admin/users/[id]/reset-pin
 * SuperAdmin only: generate PIN baru, simpan hash, lalu kirim via WhatsApp (best-effort)
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { withAdminAuth } from '@/lib/proxy/route-proxy';
import { UserRepository } from '@/repositories/UserRepository';
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils';
import { securityLogService, SecurityEventType } from '@/services/security/SecurityLogService';
import { getWhatsAppService } from '@/services/whatsapp/WhatsAppServiceFactory';

const userRepository = new UserRepository();

function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function generateTempPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminAuth(async (_req: Request, session) => {
    try {
      const { id } = await params;
      if (!isValidUuid(id)) {
        return Response.json(
          { success: false, error: 'Validation error', message: 'ID user tidak valid' },
          { status: 400 }
        );
      }

      const user = await userRepository.findById(id);
      if (!user) {
        return Response.json(
          { success: false, error: 'User not found', message: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      // Safety: jangan reset PIN diri sendiri tanpa sadar (masih boleh, tapi konfirmasi UI yang handle)
      const tempPin = generateTempPin();
      const pinHash = await bcrypt.hash(tempPin, 10);

      await userRepository.resetPin(id, pinHash, { markPinSet: true });

      // Kirim WA (best-effort)
      let waSent = false;
      let waError: string | undefined;
      try {
        const formattedPhone = formatPhoneNumber(user.phone);
        if (!isValidPhoneNumber(formattedPhone)) {
          throw new Error('Nomor WhatsApp target tidak valid');
        }

        const wa = getWhatsAppService();
        const message =
          `PIN akun Laundry SaaS Anda telah direset.\n\n` +
          `Nama: *${user.name}*\n` +
          `PIN baru: *${tempPin}*\n\n` +
          `Silakan login dan segera ubah PIN di menu Settings → Ubah PIN.\n` +
          `Jangan bagikan PIN ini kepada siapapun.`;
        waSent = await wa.sendMessage(user.phone, message);
        if (!waSent) {
          waError = 'Gagal mengirim pesan WhatsApp (provider mengembalikan status gagal)';
        }
      } catch (e) {
        waSent = false;
        waError = e instanceof Error ? e.message : 'Gagal mengirim pesan WhatsApp';
      }

      await securityLogService.logEvent({
        userId: session.userId,
        phone: session.phone,
        eventType: SecurityEventType.ADMIN_USER_RESET_PIN,
        success: true,
        metadata: {
          targetUserId: id,
          waSent,
          waError,
        },
      });

      return Response.json({
        success: true,
        message: waSent ? 'PIN berhasil direset dan dikirim via WhatsApp' : 'PIN berhasil direset (belum terkirim via WhatsApp)',
        ...(process.env.NODE_ENV !== 'production' && !waSent && {
          tempPin,
          waError,
        }),
      });
    } catch (error) {
      console.error('Error resetting PIN:', error);
      return Response.json(
        {
          success: false,
          error: 'Failed to reset PIN',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  })(request);
}

