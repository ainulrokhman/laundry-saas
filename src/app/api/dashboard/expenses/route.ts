
import { z } from 'zod';
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ExpensesService } from '@/services/dashboard/ExpensesService';

const expensesService = new ExpensesService();

const createSchema = z.object({
    amount: z.number().min(0, 'Jumlah harus positif'),
    description: z.string().min(1, 'Deskripsi wajib diisi'),
    category: z.string().optional(),
    date: z.string().datetime().optional(), // ISO stirng
});

export const GET = withAuth(async (request: Request, session: ExtendedSession) => {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    try {
        const result = await expensesService.listExpenses(session, {
            startDate,
            endDate,
            page,
            limit
        });
        return Response.json(result);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return Response.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
});

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
