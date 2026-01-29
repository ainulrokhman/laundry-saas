
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/proxy/route-proxy';
import { prisma } from '@/lib/prisma';
import { PaymentMethod, PaymentStatus, TransType, Role } from '@/generated/prisma';

export const POST = withAuth(
    async (request, session) => {
        try {
            const body = await request.json();
            const { packageId, proofUrl } = body;

            if (!packageId || !proofUrl) {
                return NextResponse.json(
                    { error: 'Package ID and Proof URL are required' },
                    { status: 400 }
                );
            }

            // 1. Validate Package
            const pkg = await prisma.subscriptionPackage.findUnique({
                where: { id: packageId },
            });

            if (!pkg) {
                return NextResponse.json(
                    { error: 'Package not found' },
                    { status: 404 }
                );
            }

            // 2. Create Transaction
            const transaction = await prisma.transaction.create({
                data: {
                    type: TransType.SUBSCRIPTION,
                    amount: pkg.price,
                    paymentMethod: PaymentMethod.TRANSFER,
                    status: PaymentStatus.PENDING,
                    userId: session.userId,
                    packageId: pkg.id,
                    proofUrl: proofUrl,
                    gatewayTransactionId: `SUB-${Date.now()}-${session.userId.substring(0, 4)}`, // Mock ID for manual transfer reference
                },
            });

            return NextResponse.json({
                success: true,
                data: transaction,
                message: 'Permintaan upgrade berhasil dikirim. Menunggu verifikasi admin.',
            });

        } catch (error) {
            console.error('Error submitting upgrade:', error);
            return NextResponse.json(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        }
    },
    { roles: [Role.OWNER], requireOutlet: false } // Global scope allowed
);
