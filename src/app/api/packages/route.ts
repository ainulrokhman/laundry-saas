
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const packages = await prisma.subscriptionPackage.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: packages,
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch packages' },
            { status: 500 }
        );
    }
}
