import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ReportsService } from '@/services/ReportsService';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Role } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

const reportsService = new ReportsService();

// Validation schema for query parameters
const querySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    period: z.enum(['7days', '30days', 'thisMonth', 'lastMonth', 'custom']).optional().default('30days'),
    mode: z.enum(['single', 'global']).optional().default('single'),
});

export const GET = withAuth(
    async (request: Request, session: ExtendedSession) => {
        const { searchParams } = new URL(request.url);
        const query = {
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            period: searchParams.get('period') || undefined,
            mode: searchParams.get('mode') || undefined,
        };

        const parsedQuery = querySchema.safeParse(query);

        if (!parsedQuery.success) {
            return Response.json(
                { error: 'Invalid parameters', details: parsedQuery.error.flatten() },
                { status: 400 }
            );
        }

        const { startDate: startDateStr, endDate: endDateStr, period, mode } = parsedQuery.data;

        // Determine date range
        let start: Date;
        let end: Date = endOfDay(new Date());

        if (period === 'custom' && startDateStr && endDateStr) {
            start = startOfDay(new Date(startDateStr));
            end = endOfDay(new Date(endDateStr));
        } else if (period === 'thisMonth') {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = endOfDay(now);
        } else if (period === 'lastMonth') {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
        } else if (period === '7days') {
            start = startOfDay(subDays(new Date(), 6));
        } else {
            // Default to 30 days
            start = startOfDay(subDays(new Date(), 29));
        }

        try {
            // Determine effective mode
            // If user has no active outlet and is OWNER, auto-switch to global mode
            let effectiveMode = mode;
            if (!session.outletId && session.role === Role.OWNER) {
                effectiveMode = 'global';
            }

            // Global mode - aggregate from all owned outlets (OWNER only)
            if (effectiveMode === 'global') {
                if (session.role !== Role.OWNER) {
                    return Response.json(
                        { error: 'Mode global hanya tersedia untuk OWNER' },
                        { status: 403 }
                    );
                }

                const globalReports = await reportsService.getGlobalReports(session, start, end);
                return Response.json(globalReports);
            }

            // Single outlet mode requires outletId
            if (!session.outletId) {
                return Response.json(
                    { error: 'Outlet context required. Please select an outlet first.' },
                    { status: 400 }
                );
            }

            // Single outlet mode (default)
            const reports = await reportsService.getReports(session, start, end);
            return Response.json(reports);
        } catch (error) {
            console.error('Error fetching reports:', error);
            return Response.json(
                { error: 'Gagal memuat laporan' },
                { status: 500 }
            );
        }
    },
    { requireOutlet: false } // Allow global mode without active outlet
);
