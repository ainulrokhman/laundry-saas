'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { PaymentStatus, TransType } from '@/generated/prisma';

interface Transaction {
    id: string;
    type: TransType;
    amount: number;
    status: PaymentStatus;
    paymentMethod: string | null;
    proofUrl: string | null;
    description: string | null;
    createdAt: string;
    settledAt: string | null;
    bankAccount: {
        bankName: string;
        accountNumber: string;
    } | null;
}

interface TransactionStats {
    totalRevenue: number;
    subscriptionRevenue: number;
    laundryRevenue: number;
    pendingCount: number;
    completedCount: number;
}

export default function TransactionsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Filters
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const fetchTransactions = async (page: number = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
            });

            if (typeFilter) params.append('type', typeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const res = await fetch(`/api/dashboard/transactions?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch transactions');

            const data = await res.json();
            setTransactions(data.data);
            setPagination(data.pagination);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Gagal memuat data transaksi',
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const res = await fetch(`/api/dashboard/transactions/stats?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch stats');

            const data = await res.json();
            setStats(data.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (session) {
            fetchTransactions(1);
            fetchStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, typeFilter, statusFilter, dateFrom, dateTo]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (typeFilter) params.append('type', typeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const res = await fetch(`/api/dashboard/transactions/export?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to export');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Data transaksi berhasil di-export',
                timer: 2000,
            });
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Gagal export data',
            });
        }
    };

    const getStatusBadge = (status: PaymentStatus) => {
        const badges = {
            UNPAID: 'bg-secondary',
            PENDING: 'bg-warning text-dark',
            SETTLEMENT: 'bg-success',
            FAILURE: 'bg-danger',
        };
        return badges[status] || 'bg-secondary';
    };

    const getTypeBadge = (type: TransType) => {
        return type === TransType.SUBSCRIPTION ? 'bg-primary' : 'bg-info';
    };

    const resetFilters = () => {
        setTypeFilter('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
    };

    if (!stats && loading) {
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
                <h1 className="h3 mb-0 text-gray-800">Manajemen Transaksi</h1>
                <button className="btn btn-success" onClick={handleExport} disabled={loading}>
                    <i className="fas fa-file-csv me-1"></i> Export CSV
                </button>
            </div>

            {/* Info Boxes */}
            <div className="row">
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-success elevation-1">
                            <i className="fas fa-wallet"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pendapatan</span>
                            <span className="info-box-number text-success">
                                {formatCurrency(stats?.totalRevenue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-primary elevation-1">
                            <i className="fas fa-star"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Subscription</span>
                            <span className="info-box-number text-primary">
                                {formatCurrency(stats?.subscriptionRevenue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-info elevation-1">
                            <i className="fas fa-shopping-bag"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Laundry Orders</span>
                            <span className="info-box-number text-info">
                                {formatCurrency(stats?.laundryRevenue || 0)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box mb-3">
                        <span className="info-box-icon bg-warning elevation-1">
                            <i className="fas fa-clock"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Pending</span>
                            <span className="info-box-number text-warning">
                                {stats?.pendingCount || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <div className="card shadow-sm mb-4">
                <div className="card-header">
                    <h3 className="card-title">Filter Transaksi</h3>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Tipe</label>
                            <select
                                className="form-select"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">Semua Tipe</option>
                                <option value="SUBSCRIPTION">Subscription</option>
                                <option value="LAUNDRY_ORDER">Laundry Order</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Semua Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="SETTLEMENT">Settlement</option>
                                <option value="FAILURE">Failure</option>
                                <option value="UNPAID">Unpaid</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Dari Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Sampai Tanggal</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2 d-flex align-items-end">
                            <button className="btn btn-secondary w-100" onClick={resetFilters}>
                                <i className="fas fa-redo me-1"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card shadow-sm">
                <div className="card-header">
                    <h3 className="card-title">Daftar Transaksi</h3>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                            <p>Tidak ada transaksi</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="table table-hover table-striped mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Tipe</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Metode</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((transaction) => (
                                            <tr key={transaction.id}>
                                                <td>{formatDateTime(transaction.createdAt)}</td>
                                                <td>
                                                    <span className={`badge ${getTypeBadge(transaction.type)}`}>
                                                        {transaction.type === TransType.SUBSCRIPTION ? 'Subscription' : 'Laundry'}
                                                    </span>
                                                </td>
                                                <td className="fw-bold">{formatCurrency(transaction.amount)}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(transaction.status)}`}>
                                                        {transaction.status}
                                                    </span>
                                                </td>
                                                <td>{transaction.paymentMethod || '-'}</td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => setSelectedTransaction(transaction)}
                                                        data-bs-toggle="modal"
                                                        data-bs-target="#transactionDetailModal"
                                                    >
                                                        <i className="fas fa-eye"></i> Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="card-footer">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted">
                                            Menampilkan {transactions.length} dari {pagination.total} transaksi
                                        </span>
                                        <nav>
                                            <ul className="pagination mb-0">
                                                <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => fetchTransactions(pagination.page - 1)}
                                                        disabled={pagination.page === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                </li>
                                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                                    .filter((p) => {
                                                        return (
                                                            p === 1 ||
                                                            p === pagination.totalPages ||
                                                            Math.abs(p - pagination.page) <= 2
                                                        );
                                                    })
                                                    .map((p) => (
                                                        <li key={p} className={`page-item ${pagination.page === p ? 'active' : ''}`}>
                                                            <button className="page-link" onClick={() => fetchTransactions(p)}>
                                                                {p}
                                                            </button>
                                                        </li>
                                                    ))}
                                                <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => fetchTransactions(pagination.page + 1)}
                                                        disabled={pagination.page === pagination.totalPages}
                                                    >
                                                        Next
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Transaction Detail Modal */}
            <div className="modal fade" id="transactionDetailModal" tabIndex={-1}>
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Detail Transaksi</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        {selectedTransaction && (
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <strong>Transaction ID:</strong>
                                        <p className="text-muted mb-0 font-monospace small">{selectedTransaction.id}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Tipe:</strong>
                                        <p className="mb-0">
                                            <span className={`badge ${getTypeBadge(selectedTransaction.type)}`}>
                                                {selectedTransaction.type}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Amount:</strong>
                                        <p className="mb-0 fw-bold fs-5">{formatCurrency(selectedTransaction.amount)}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Status:</strong>
                                        <p className="mb-0">
                                            <span className={`badge ${getStatusBadge(selectedTransaction.status)}`}>
                                                {selectedTransaction.status}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Metode Pembayaran:</strong>
                                        <p className="mb-0">{selectedTransaction.paymentMethod || '-'}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Tanggal Transaksi:</strong>
                                        <p className="mb-0">{formatDateTime(selectedTransaction.createdAt)}</p>
                                    </div>
                                    {selectedTransaction.settledAt && (
                                        <div className="col-md-6">
                                            <strong>Tanggal Settlement:</strong>
                                            <p className="mb-0">{formatDateTime(selectedTransaction.settledAt)}</p>
                                        </div>
                                    )}
                                    {selectedTransaction.bankAccount && (
                                        <div className="col-md-6">
                                            <strong>Bank Account:</strong>
                                            <p className="mb-0">
                                                {selectedTransaction.bankAccount.bankName} -{' '}
                                                {selectedTransaction.bankAccount.accountNumber}
                                            </p>
                                        </div>
                                    )}
                                    {selectedTransaction.description && (
                                        <div className="col-12">
                                            <strong>Deskripsi:</strong>
                                            <p className="mb-0">{selectedTransaction.description}</p>
                                        </div>
                                    )}
                                    {selectedTransaction.proofUrl && (
                                        <div className="col-12">
                                            <strong>Bukti Transfer:</strong>
                                            <div className="mt-2">
                                                <img
                                                    src={selectedTransaction.proofUrl}
                                                    alt="Bukti Transfer"
                                                    className="img-fluid rounded border"
                                                    style={{ maxHeight: '400px' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
