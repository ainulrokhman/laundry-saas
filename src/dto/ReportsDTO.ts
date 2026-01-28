export interface DailyStat {
    date: string;
    count: number;
    revenue: number;
}

export interface ReportsSummary {
    totalOrders: number;
    totalRevenue: number;
    totalExpense: number; // New
    netProfit: number;    // New
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
}

export interface ReportsResponseDTO {
    summary: ReportsSummary;
    dailyStats: DailyStat[];
    paymentMethods: PaymentMethodStat[]; // New
    unpaidOrders: UnpaidOrder[];         // New
    period: {
        startDate: string;
        endDate: string;
    };
}
