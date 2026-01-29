
import { BaseService } from '../BaseService';
import { ExpenseRepository } from '@/repositories/ExpenseRepository';
import { SessionUser } from '@/lib/session';

export class ExpensesService extends BaseService {
    private expenseRepo: ExpenseRepository;

    constructor() {
        super();
        this.expenseRepo = new ExpenseRepository();
    }

    async listExpenses(
        user: SessionUser | null,
        params: {
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        const outletId = this.getOutletId(user);
        return this.expenseRepo.findAll({
            outletId,
            ...params,
        });
    }

    async createExpense(
        user: SessionUser | null,
        data: {
            amount: number;
            description: string;
            category?: string;
            date: Date;
        }
    ) {
        const outletId = this.getOutletId(user);
        return this.expenseRepo.create({
            outletId,
            ...data,
        });
    }

    async deleteExpense(user: SessionUser | null, id: string) {
        const outletId = this.getOutletId(user);
        return this.expenseRepo.delete(outletId, id);
    }

    /**
     * List expenses from all owned outlets (Global Mode - OWNER only)
     */
    async listGlobalExpenses(
        outletIds: string[],
        params: {
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        }
    ) {
        return this.expenseRepo.findAllByOutletIds({
            outletIds,
            ...params,
        });
    }
}
