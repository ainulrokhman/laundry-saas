
import prisma from '@/lib/prisma';
import { Expense, Prisma } from '@/generated/prisma';

export class ExpenseRepository {
    async findAll({
        outletId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
    }: {
        outletId: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        const skip = (page - 1) * limit;
        const where: Prisma.ExpenseWhereInput = {
            outletId,
            ...(startDate && endDate && {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [total, expenses] = await Promise.all([
            prisma.expense.count({ where }),
            prisma.expense.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
            }),
        ]);

        return { total, expenses, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async create(data: {
        outletId: string;
        amount: number;
        description: string;
        category?: string;
        date: Date;
    }) {
        return prisma.expense.create({
            data,
        });
    }

    async getTotalExpenses(outletId: string, startDate: Date, endDate: Date): Promise<number> {
        const aggregate = await prisma.expense.aggregate({
            where: {
                outletId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return aggregate._sum.amount || 0;
    }

    async delete(outletId: string, id: string) {
        return prisma.expense.deleteMany({
            where: { id, outletId },
        });
    }

    // ============================================
    // Global Reports Methods (Multi-Outlet)
    // ============================================

    /**
     * Get total expenses for multiple outlets (Global Reports)
     */
    async getGlobalTotalExpenses(
        outletIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        if (outletIds.length === 0) {
            return 0;
        }

        const aggregate = await prisma.expense.aggregate({
            where: {
                outletId: { in: outletIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return aggregate._sum.amount || 0;
    }

    /**
     * Get per-outlet expense breakdown (Global Reports)
     */
    async getPerOutletExpenseBreakdown(
        outletIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<Array<{ outletId: string; totalExpense: number }>> {
        if (outletIds.length === 0) {
            return [];
        }

        const result = await prisma.expense.groupBy({
            by: ['outletId'],
            where: {
                outletId: { in: outletIds },
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return result.map(r => ({
            outletId: r.outletId,
            totalExpense: r._sum.amount || 0,
        }));
    }

    /**
     * Find all expenses for multiple outlets (Global Mode)
     */
    async findAllByOutletIds({
        outletIds,
        startDate,
        endDate,
        page = 1,
        limit = 10,
    }: {
        outletIds: string[];
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }) {
        if (outletIds.length === 0) {
            return { total: 0, expenses: [], page, limit, totalPages: 0 };
        }

        const skip = (page - 1) * limit;
        const where: Prisma.ExpenseWhereInput = {
            outletId: { in: outletIds },
            ...(startDate && endDate && {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            }),
        };

        const [total, expenses] = await Promise.all([
            prisma.expense.count({ where }),
            prisma.expense.findMany({
                where,
                include: {
                    outlet: {
                        select: { id: true, name: true },
                    },
                },
                skip,
                take: limit,
                orderBy: { date: 'desc' },
            }),
        ]);

        return { total, expenses, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
