/**
 * Transaction Management Service (OWNER)
 * 
 * Business logic for transaction management on the owner dashboard.
 * Handles listing, filtering, and exporting transactions for outlet owners.
 */

import { TransactionRepository } from '@/repositories/TransactionRepository';
import { PaymentStatus, TransType } from '@/generated/prisma';

export interface TransactionFilters {
    type?: TransType;
    status?: PaymentStatus;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
}

export interface TransactionStats {
    totalRevenue: number;
    subscriptionRevenue: number;
    laundryRevenue: number;
    pendingCount: number;
    completedCount: number;
}

export class TransactionManagementService {
    private transactionRepo: TransactionRepository;

    constructor() {
        this.transactionRepo = new TransactionRepository();
    }

    /**
     * Get transactions with filtering and pagination
     */
    async getTransactions(outletId: string, filters?: TransactionFilters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const skip = (page - 1) * limit;

        //  Build prisma filters
        const where: any = {};
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.createdAt.lte = filters.dateTo;
            }
        }

        const [transactions, total] = await Promise.all([
            this.transactionRepo.find(outletId, {
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    bankAccount: {
                        select: {
                            bankName: true,
                            accountNumber: true,
                        },
                    },
                },
            }),
            this.transactionRepo.count(outletId, where),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get single transaction detail
     */
    async getTransactionDetail(outletId: string, transactionId: string) {
        const transaction = await this.transactionRepo.findById(outletId, transactionId);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        return transaction;
    }

    /**
     * Get transaction statistics
     */
    async getTransactionStats(outletId: string, filters?: {
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<TransactionStats> {
        // Build date filter
        const dateFilter: any = {};
        if (filters?.dateFrom || filters?.dateTo) {
            if (filters.dateFrom) {
                dateFilter.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                dateFilter.lte = filters.dateTo;
            }
        }

        // Get revenue by type
        const [
            totalRevenue,
            subscriptionRevenue,
            laundryRevenue,
            pendingCount,
            completedCount,
        ] = await Promise.all([
            this.transactionRepo.getTotalRevenue(outletId, {
                status: PaymentStatus.SETTLEMENT,
                ...(Object.keys(dateFilter).length > 0 && { dateFrom: dateFilter.gte, dateTo: dateFilter.lte }),
            }),
            this.transactionRepo.getTotalRevenue(outletId, {
                type: TransType.SUBSCRIPTION,
                status: PaymentStatus.SETTLEMENT,
                ...(Object.keys(dateFilter).length > 0 && { dateFrom: dateFilter.gte, dateTo: dateFilter.lte }),
            }),
            this.transactionRepo.getTotalRevenue(outletId, {
                type: TransType.LAUNDRY_ORDER,
                status: PaymentStatus.SETTLEMENT,
                ...(Object.keys(dateFilter).length > 0 && { dateFrom: dateFilter.gte, dateTo: dateFilter.lte }),
            }),
            this.transactionRepo.count(outletId, {
                status: PaymentStatus.PENDING,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            }),
            this.transactionRepo.count(outletId, {
                status: PaymentStatus.SETTLEMENT,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            }),
        ]);

        return {
            totalRevenue,
            subscriptionRevenue,
            laundryRevenue,
            pendingCount,
            completedCount,
        };
    }

    /**
     * Export transactions to CSV format
     */
    async exportToCSV(outletId: string, filters?: TransactionFilters): Promise<string> {
        // Get all transactions matching filters (no pagination for export)
        const where: any = {};
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.createdAt.lte = filters.dateTo;
            }
        }

        const transactions = await this.transactionRepo.find(outletId, {
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                bankAccount: {
                    select: {
                        bankName: true,
                        accountNumber: true,
                    },
                },
            },
        });

        // Build CSV
        const headers = [
            'Transaction ID',
            'Date',
            'Type',
            'Amount',
            'Status',
            'Payment Method',
            'Bank',
            'Description',
        ];

        const rows = transactions.map((t) => [
            t.id,
            new Date(t.createdAt).toISOString(),
            t.type,
            t.amount.toString(),
            t.status,
            t.paymentMethod || 'N/A',
            t.bankAccount?.bankName || 'N/A',
            t.description || '',
        ]);

        // Convert to CSV string
        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ];

        return csvLines.join('\\n');
    }

    /**
     * Get transactions from all owned outlets (Global Mode - OWNER only)
     */
    async getGlobalTransactions(outletIds: string[], filters?: TransactionFilters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const skip = (page - 1) * limit;

        // Build prisma filters
        const where: any = {};
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.createdAt.lte = filters.dateTo;
            }
        }

        const [transactions, total] = await Promise.all([
            this.transactionRepo.findByOutletIds(outletIds, {
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    bankAccount: {
                        select: {
                            bankName: true,
                            accountNumber: true,
                        },
                    },
                },
            }),
            this.transactionRepo.countByOutletIds(outletIds, where),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get transaction statistics from all owned outlets (Global Mode - OWNER only)
     */
    async getGlobalTransactionStats(outletIds: string[], filters?: {
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<TransactionStats> {
        if (outletIds.length === 0) {
            return {
                totalRevenue: 0,
                subscriptionRevenue: 0,
                laundryRevenue: 0,
                pendingCount: 0,
                completedCount: 0,
            };
        }

        // Build date filter
        const dateFilters: { dateFrom?: Date; dateTo?: Date } = {};
        if (filters?.dateFrom) {
            dateFilters.dateFrom = filters.dateFrom;
        }
        if (filters?.dateTo) {
            dateFilters.dateTo = filters.dateTo;
        }

        // Get revenue by type from all outlets
        const [
            totalRevenue,
            subscriptionRevenue,
            laundryRevenue,
            pendingCount,
            completedCount,
        ] = await Promise.all([
            this.transactionRepo.getTotalRevenueByOutletIds(outletIds, {
                status: PaymentStatus.SETTLEMENT,
                ...dateFilters,
            }),
            this.transactionRepo.getTotalRevenueByOutletIds(outletIds, {
                type: TransType.SUBSCRIPTION,
                status: PaymentStatus.SETTLEMENT,
                ...dateFilters,
            }),
            this.transactionRepo.getTotalRevenueByOutletIds(outletIds, {
                type: TransType.LAUNDRY_ORDER,
                status: PaymentStatus.SETTLEMENT,
                ...dateFilters,
            }),
            this.transactionRepo.countByOutletIdsWithFilters(outletIds, {
                status: PaymentStatus.PENDING,
                ...dateFilters,
            }),
            this.transactionRepo.countByOutletIdsWithFilters(outletIds, {
                status: PaymentStatus.SETTLEMENT,
                ...dateFilters,
            }),
        ]);

        return {
            totalRevenue,
            subscriptionRevenue,
            laundryRevenue,
            pendingCount,
            completedCount,
        };
    }
}
