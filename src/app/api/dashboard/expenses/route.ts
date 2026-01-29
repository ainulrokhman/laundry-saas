
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ExpensesService } from '@/services/dashboard/ExpensesService';
import { Role } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const expensesService = new ExpensesService();

const createSchema = z.object({
    amount: z.number().min(0, 'Jumlah harus positif'),
    description: z.string().min(1, 'Deskripsi wajib diisi'),
    category: z.string().optional(),
    date: z.string().datetime().optional(), // ISO string
});

export const GET = withAuth(
    async (request: Request, session: ExtendedSession) => {
        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;

        try {
            // Global Mode: OWNER without active outlet
            const isGlobalMode = !session.outletId && session.role === Role.OWNER;

            if (isGlobalMode) {
                // Fetch owned outlets
                const ownedOutlets = await prisma.outlet.findMany({
                    where: { ownerId: session.userId },
                    select: { id: true },
                });
                const outletIds = ownedOutlets.map(o => o.id);

                if (outletIds.length === 0) {
                    return Response.json({
                        total: 0,
                        expenses: [],
                        page: 1,
                        limit,
                        totalPages: 0,
                        isGlobalMode: true,
                    });
                }

                const result = await expensesService.listGlobalExpenses(outletIds, {
                    startDate,
                    endDate,
                    page,
                    limit,
                });

                // Map with outlet info
                const expenses = result.expenses.map((e: any) => ({
                    ...e,
                    outletId: e.outlet?.id,
                    outletName: e.outlet?.name,
                }));

                return Response.json({
                    ...result,
                    expenses,
                    isGlobalMode: true,
                });
            }

            // Single Outlet Mode
            if (!session.outletId) {
                return Response.json(
                    { error: 'Outlet context required' },
                    { status: 400 }
                );
            }

            const result = await expensesService.listExpenses(session, {
                startDate,
                endDate,
                page,
                limit,
            });

            return Response.json({
                ...result,
                isGlobalMode: false,
            });
        } catch (error) {
            console.error('Error fetching expenses:', error);
            return Response.json({ error: 'Failed to fetch expenses' }, { status: 500 });
        }
    },
    { requireOutlet: false }
);

export const POST = withAuth(async (request: Request, session: ExtendedSession) => {
    try {
        const body = await request.json();
        const result = createSchema.safeParse(body);

        if (!result.success) {
            return Response.json(
                { error: 'Invalid data', details: result.error.flatten() },
                { status: 400 }
            );
        }

        const { amount, description, category, date } = result.data;

        const expense = await expensesService.createExpense(session, {
            amount,
            description,
            category,
            date: date ? new Date(date) : new Date(),
        });

        return Response.json(expense, { status: 201 });
    } catch (error) {
        console.error('Error creating expense:', error);
        return Response.json({ error: 'Failed to create expense' }, { status: 500 });
    }
});
