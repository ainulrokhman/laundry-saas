
import { withAuth } from '@/lib/proxy/route-proxy';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
    async (request, session) => {
        try {
            // Fetch user with subscription package & outlet count
            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                include: {
                    package: true,
                    _count: {
                        select: { ownedOutlets: true }
                    }
                }
            });

            if (!user) {
                return Response.json({ success: false, error: 'User not found' }, { status: 404 });
            }

            // Determine Subscription Status
            const today = new Date();
            const expiresAt = user.subscriptionExpiresAt;
            let status = 'TRIAL'; // Default if no package

            if (user.packageId) {
                if (expiresAt && expiresAt < today) {
                    status = 'EXPIRED';
                } else {
                    status = 'ACTIVE';
                }
            }

            return Response.json({
                success: true,
                data: {
                    packageName: user.package?.name || 'Free Trial',
                    packageDescription: user.package?.description || 'Paket percobaan',
                    price: user.package?.price || 0,
                    maxOutlets: user.package?.maxOutlets || 1, // Default trial limit
                    usedOutlets: user._count.ownedOutlets,
                    expiresAt: user.subscriptionExpiresAt,
                    startedAt: user.subscriptionStartedAt,
                    status,
                }
            });

        } catch (error) {
            console.error('Error fetching subscription:', error);
            return Response.json(
                {
                    success: false,
                    error: 'Gagal memuat data langganan',
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
                { status: 500 }
            );
        }
    },
    { roles: [Role.OWNER], requireOutlet: false } // Global scope allowed
);
