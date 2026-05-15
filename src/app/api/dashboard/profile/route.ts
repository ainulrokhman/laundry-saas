import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';

const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong').max(100, 'Nama terlalu panjang'),
});

export const PUT = withAuth(async (request: Request, session: ExtendedSession) => {
  try {
    const body = await request.json();
    const { name } = profileUpdateSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { name },
    });

    return Response.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: {
        name: updatedUser.name,
      },
    } as ApiResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: 'Data tidak valid',
        message: error.issues.map(i => i.message).join(', '),
      } as ApiResponse, { status: 400 });
    }

    console.error('Profile update error:', error);
    return Response.json({
      success: false,
      error: 'Gagal memperbarui profil',
    } as ApiResponse, { status: 500 });
  }
}, {
  requireOutlet: false,
});
