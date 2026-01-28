export interface DailyStat {
    date: string;
    count: number;
    revenue: number;
}

export interface ReportsSummary {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    averageOrderValue: number;
}

export interface ReportsResponseDTO {
    summary: ReportsSummary;
    dailyStats: DailyStat[];
    period: {
        startDate: string;
        endDate: string;
    };
}
