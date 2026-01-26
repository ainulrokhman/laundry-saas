/**
 * Cloudinary upload signature (OWNER)
 *
 * POST /api/dashboard/settings/landing-page/upload-signature
 * Body: { kind: 'logo' | 'cover' }
 */

import { z } from 'zod';
import crypto from 'crypto';
import { withOwnerAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';

const schema = z.object({
  kind: z.enum(['logo', 'cover']),
});

function envRequired(name: string): string {
  const v = String(process.env[name] ?? '').trim();
  if (!v) throw new Error(`${name} belum di-set`);
  return v;
}

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function randomId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export const POST = withOwnerAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const body: unknown = await request.json();
    const { kind } = schema.parse(body);

    const cloudName = envRequired('CLOUDINARY_CLOUD_NAME');
    const apiKey = envRequired('CLOUDINARY_API_KEY');
    const apiSecret = envRequired('CLOUDINARY_API_SECRET');
    const baseFolder = String(process.env.CLOUDINARY_FOLDER ?? 'laundry-saas/outlets').trim();

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${baseFolder}/${session.outletId}`;
    const publicId = `${kind}-${randomId()}`;

    // Cloudinary signature: sort params & sha1("k=v&..."+apiSecret)
    const toSign = [`folder=${folder}`, `public_id=${publicId}`, `timestamp=${timestamp}`].join('&');
    const signature = sha1(`${toSign}${apiSecret}`);

    return Response.json({
      success: true,
      data: {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        publicId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Validation error',
          message: error.issues.map((i) => i.message).join(', '),
          errors: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating upload signature:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to create upload signature',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

