'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ReportsResponseDTO } from '@/dto/ReportsDTO';
import { RevenueChart } from '@/components/ui/Charts/RevenueChart';
import Swal from 'sweetalert2';

export default function ReportsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ReportsResponseDTO | null>(null);
    const [period, setPeriod] = useState<string>('30days');
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
        start: '',
        end: '',
    });

    const fetchReports = async () => {
        try {
            setLoading(true);
            let url = `/api/dashboard/reports?period=${period}`;

            if (period === 'custom' && customRange.start && customRange.end) {
                url += `&startDate=${customRange.start}&endDate=${customRange.end}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Gagal mengambil data laporan');

            const jsonData = await res.json();
            setData(jsonData);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports data',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (period !== 'custom' || (customRange.start && customRange.end)) {
            fetchReports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, customRange, session]);

    const handleExport = () => {
        if (!data) return;

        // Simple CSV export
        const headers = ['Date', 'Orders', 'Revenue'];
        const rows = data.dailyStats.map(d => [d.date, d.count, d.revenue]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reports-${period}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (!data && loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0 text-gray-800">Laporan Pesanan</h1>
                <div className="d-flex gap-2">
                    <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="7days">7 Hari Terakhir</option>
                        <option value="30days">30 Hari Terakhir</option>
                        <option value="thisMonth">Bulan Ini</option>
                        <option value="lastMonth">Bulan Lalu</option>
                        <option value="custom">Rentang Kustom</option>
                    </select>

                    {period === 'custom' && (
                        <div className="d-flex gap-2">
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                            <span className="align-self-center">-</span>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    )}

                    <button className="btn btn-sm btn-success" onClick={handleExport} disabled={!data}>
                        <i className="fas fa-file-csv me-1"></i> Export CSV
                    </button>
                </div>
            </div>

            {/* Info Boxes */}
            <div className="row">
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box">
                        <span className="info-box-icon bg-info elevation-1">
                            <i className="fas fa-shopping-cart"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pesanan</span>
                            <span className="info-box-number">
                                {data?.summary.totalOrders || 0}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-success elevation-1">
                            <i className="fas fa-money-bill-wave"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pendapatan</span>
                            <span className="info-box-number">
                                {formatCurrency(data?.summary.totalRevenue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-warning elevation-1">
                            <i className="fas fa-users"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Pelanggan Unik</span>
                            <span className="info-box-number">
                                {data?.summary.totalCustomers || 0}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-danger elevation-1">
                            <i className="fas fa-tag"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Rata-rata Order</span>
                            <span className="info-box-number">
                                {formatCurrency(data?.summary.averageOrderValue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="row">
                <div className="col-md-12">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Ringkasan Pendapatan & Pesanan</h3>
                            <div className="card-tools">
                                <button type="button" className="btn btn-tool" data-card-widget="collapse">
                                    <i className="fas fa-minus"></i>
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {data && (
                                <RevenueChart
                                    data={data.dailyStats}
                                    title={`Performa: ${new Date(data.period.startDate).toLocaleDateString('id-ID')} - ${new Date(data.period.endDate).toLocaleDateString('id-ID')}`}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
