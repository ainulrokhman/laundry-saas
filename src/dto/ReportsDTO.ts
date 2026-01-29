export interface DailyStat {
    date: string;
    count: number;
    revenue: number;
}

export interface ReportsSummary {
    totalOrders: number;
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    totalCustomers: number;
    averageOrderValue: number;
}

export interface PaymentMethodStat {
    method: string;
    count: number;
    amount: number;
}

export interface UnpaidOrder {
    id: string;
    trackingCode: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number; // If DP
    remainingAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    outletName?: string; // For global reports
}

export interface ReportsResponseDTO {
    summary: ReportsSummary;
    dailyStats: DailyStat[];
    paymentMethods: PaymentMethodStat[];
    unpaidOrders: UnpaidOrder[];
    period: {
        startDate: string;
        endDate: string;
    };
}

// ============================================
// Global Reports DTO (Multi-Outlet)
// ============================================

export interface OutletBreakdown {
    outletId: string;
    outletName: string;
    totalOrders: number;
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
}

export interface GlobalReportsResponseDTO {
    summary: ReportsSummary;
    dailyStats: DailyStat[];
    paymentMethods: PaymentMethodStat[];
    unpaidOrders: UnpaidOrder[];
    outletBreakdown: OutletBreakdown[]; // Per-outlet comparison
    period: {
        startDate: string;
        endDate: string;
    };
    totalOutlets: number;
}
