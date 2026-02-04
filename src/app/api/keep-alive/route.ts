
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Perform a lightweight query to wake up the database
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Database is active',
        }, { status: 200 });
    } catch (error) {
        console.error('Keep-alive failed:', error);
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            message: 'Failed to keep database alive',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
