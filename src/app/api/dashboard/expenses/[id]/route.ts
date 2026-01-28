
import { withAuth } from '@/lib/proxy/route-proxy';
import { ExtendedSession } from '@/lib/auth';
import { ExpensesService } from '@/services/dashboard/ExpensesService';

const expensesService = new ExpensesService();

export const DELETE = withAuth(async (request: Request, session: ExtendedSession, { params }: { params: { id: string } }) => {
    try {
        await expensesService.deleteExpense(session, params.id);
        return Response.json({ success: true });
    } catch (error) {
        console.error('Error deleting expense:', error);
        return Response.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
});
