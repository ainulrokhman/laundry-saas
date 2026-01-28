
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ReportsResponseDTO } from '@/dto/ReportsDTO';
import { RevenueChart } from '@/components/ui/Charts/RevenueChart';
import Swal from 'sweetalert2';
import { formatDateTime } from '@/lib/utils';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

export default function ReportsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ReportsResponseDTO | null>(null);
    const [period, setPeriod] = useState<string>('30days');
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
        start: '',
        end: '',
    });
    const [activeTab, setActiveTab] = useState<'summary' | 'payment-methods' | 'receivables'>('summary');

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

        // Simple CSV export based on active tab
        let headers: string[] = [];
        let rows: (string | number)[][] = [];
        let filename = `reports-${period}.csv`;

        if (activeTab === 'summary') {
            headers = ['Date', 'Orders', 'Revenue'];
            rows = data.dailyStats.map(d => [d.date, d.count, d.revenue]);
        } else if (activeTab === 'payment-methods') {
            headers = ['Method', 'Count', 'Amount'];
            rows = data.paymentMethods.map(p => [p.method, p.count, p.amount]);
            filename = `payment-methods-${period}.csv`;
        } else if (activeTab === 'receivables') {
            headers = ['Tracking Code', 'Customer', 'Status', 'Payment Status', 'Total Amount', 'Paid Amount', 'Remaining'];
            rows = data.unpaidOrders.map(o => [o.trackingCode, o.customerName, o.status, o.paymentStatus, o.totalAmount, o.paidAmount, o.remainingAmount]);
            filename = `receivables-${period}.csv`;
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
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
                <h1 className="h3 mb-0 text-gray-800">Laporan Keuangan</h1>
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

            {/* Info Boxes - Financial Overview */}
            <div className="row">
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-success elevation-1">
                            <i className="fas fa-arrow-up"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pendapatan</span>
                            <span className="info-box-number text-success">
                                {formatCurrency(data?.summary.totalRevenue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-danger elevation-1">
                            <i className="fas fa-arrow-down"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pengeluaran</span>
                            <span className="info-box-number text-danger">
                                {formatCurrency(data?.summary.totalExpense || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-info elevation-1">
                            <i className="fas fa-wallet"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Laba Bersih</span>
                            <span className={`info-box-number ${(data?.summary.netProfit || 0) >= 0 ? 'text-primary' : 'text-danger'}`}>
                                {formatCurrency(data?.summary.netProfit || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-warning elevation-1">
                            <i className="fas fa-file-invoice-dollar"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Piutang (Bon)</span>
                            <span className="info-box-number text-warning">
                                {formatCurrency(data?.unpaidOrders.reduce((acc, curr) => acc + curr.remainingAmount, 0) || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        <i className="fas fa-chart-line me-2"></i> Ringkasan & Grafik
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'payment-methods' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payment-methods')}
                    >
                        <i className="fas fa-credit-card me-2"></i> Metode Pembayaran
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'receivables' ? 'active' : ''}`}
                        onClick={() => setActiveTab('receivables')}
                    >
                        <i className="fas fa-user-clock me-2"></i> Piutang Pelanggan
                    </button>
                </li>
            </ul>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card shadow-sm">
                                <div className="card-header border-0">
                                    <h3 className="card-title">Grafik Pendapatan</h3>
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
                )}

                {/* Payment Methods Tab */}
                {activeTab === 'payment-methods' && (
                    <div className="card shadow-sm">
                        <div className="card-header border-0">
                            <h3 className="card-title">Rincian Pembayaran</h3>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Metode Pembayaran</th>
                                            <th className="text-center">Jumlah Transaksi</th>
                                            <th className="text-end">Total Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.paymentMethods.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-4 text-muted">Belum ada data pembayaran</td>
                                            </tr>
                                        ) : (
                                            data?.paymentMethods.map((pm, idx) => (
                                                <tr key={idx}>
                                                    <td className="fw-medium">{pm.method}</td>
                                                    <td className="text-center">{pm.count}</td>
                                                    <td className="text-end fw-bold">{formatCurrency(pm.amount)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Receivables Tab */}
                {activeTab === 'receivables' && (
                    <div className="card shadow-sm">
                        <div className="card-header border-0">
                            <h3 className="card-title">Daftar Piutang (Belum Lunas)</h3>
                        </div>
                        <div className="card-body p-0">
                            <ResponsiveTableToCards
                                items={data?.unpaidOrders || []}
                                getRowKey={(o) => o.id}
                                mobileContainerClassName="px-3 pt-2 pb-3"
                                columns={[
                                    { header: 'Kode', render: (o) => <span className="badge bg-secondary">{o.trackingCode}</span> },
                                    { header: 'Pelanggan', render: (o) => o.customerName },
                                    { header: 'Status Order', render: (o) => <span className="badge bg-info">{o.status}</span> },
                                    { header: 'Status Bayar', render: (o) => <span className="badge bg-warning text-dark">{o.paymentStatus}</span> },
                                    { header: 'Total', render: (o) => formatCurrency(o.totalAmount) },
                                    { header: 'Sisa Tagihan', render: (o) => <span className="text-danger fw-bold">{formatCurrency(o.remainingAmount)}</span> },
                                    { header: 'Tanggal', render: (o) => formatDateTime(o.createdAt) },
                                ]}
                                emptyState={
                                    <div className="text-center py-5 text-muted">
                                        <i className="fas fa-check-circle fa-3x mb-3 opacity-50 text-success"></i>
                                        <p>Tidak ada piutang. Semua pesanan lunas!</p>
                                    </div>
                                }
                                renderMobileCard={(o) => (
                                    <div className="card mb-3 shadow-sm border-start border-warning border-4">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="badge bg-secondary">{o.trackingCode}</span>
                                                <span className="text-muted small">{formatDateTime(o.createdAt)}</span>
                                            </div>
                                            <h5 className="card-title fw-bold mb-1">{o.customerName}</h5>
                                            <div className="mb-2">
                                                <span className="badge bg-warning text-dark me-1">{o.paymentStatus}</span>
                                                <span className="badge bg-info">{o.status}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                                                <span className="text-muted">Sisa Tagihan:</span>
                                                <span className="text-danger fw-bold fs-5">{formatCurrency(o.remainingAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
