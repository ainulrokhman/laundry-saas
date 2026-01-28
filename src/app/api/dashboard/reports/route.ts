import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ReportsService } from '@/services/ReportsService';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const reportsService = new ReportsService();

// Validation schema for query parameters
const querySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    period: z.enum(['7days', '30days', 'thisMonth', 'lastMonth', 'custom']).optional().default('30days'),
});

export const GET = withAuth(async (request: Request, session: ExtendedSession) => {
    const { searchParams } = new URL(request.url);
    const query = {
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        period: searchParams.get('period') || undefined,
    };

    const parsedQuery = querySchema.safeParse(query);

    if (!parsedQuery.success) {
        return Response.json(
            { error: 'Invalid parameters', details: parsedQuery.error.flatten() },
            { status: 400 }
        );
    }

    const { startDate: startDateStr, endDate: endDateStr, period } = parsedQuery.data;

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
        const reports = await reportsService.getReports(session, start, end);
        return Response.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return Response.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
});
