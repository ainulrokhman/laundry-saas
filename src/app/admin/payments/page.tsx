/**
 * Admin Payments Page
 *
 * SUPERADMIN UI untuk verifikasi pembayaran subscription:
 * - List pembayaran dengan filter (status, search)
 * - Lihat detail pembayaran + bukti transfer
 * - Setujui/tolak pembayaran
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role, PaymentStatus } from '@/generated/prisma';
import { formatDateTime, formatCurrency } from '@/lib/utils';

type PaymentRow = {
    id: string;
    type: string;
    amount: number;
    paymentMethod: string | null;
    status: PaymentStatus;
    proofUrl: string | null;
    createdAt: string;
    updatedAt: string;
    verifiedAt: string | null;
    externalId: string | null;
    outletId: string | null;
    package?: {
        name: string;
        price: number;
        maxOutlets: number;
    };
    userSubscription?: {
        expiresAt: string | null;
    };
};

type PaymentStats = {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export default function AdminPaymentsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [stats, setStats] = useState<PaymentStats>({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
    });

    // Modal state
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const userRole = (session?.user as any)?.role as Role | undefined;
    const canLoad = status === 'authenticated' && userRole === Role.SUPERADMIN;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            if (userRole !== Role.SUPERADMIN) {
                router.push('/dashboard');
                return;
            }

            void Promise.all([fetchStats(), fetchPayments(1)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, userRole]);

    const buildQuery = (page: number) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));

        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (search.trim().length > 0) params.set('search', search.trim());

        return params.toString();
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/payments/stats');
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Gagal memuat statistik');
            setStats(json.data || { pending: 0, approved: 0, rejected: 0, total: 0 });
        } catch (e) {
            console.error('Fetch stats error:', e);
            // Stats error tidak perlu fail seluruh halaman
        }
    };

    const fetchPayments = async (page: number) => {
        try {
            setLoading(true);
            setError(null);
            const qs = buildQuery(page);
            const res = await fetch(`/api/admin/payments?${qs}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Gagal memuat pembayaran');

            setPayments(json.data || []);
            if (json.pagination) setPagination(json.pagination);
        } catch (e) {
            console.error('Fetch payments error:', e);
            setError(e instanceof Error ? e.message : 'Gagal memuat pembayaran');
        } finally {
            setLoading(false);
        }
    };

    const viewDetails = async (payment: PaymentRow) => {
        setSelectedPayment(payment);
        setShowDetailModal(true);
        setDetailLoading(true);

        try {
            const res = await fetch(`/api/admin/payments/${payment.id}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Gagal memuat detail');
            setSelectedPayment(json.data);
        } catch (e) {
            console.error('Fetch detail error:', e);
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: e instanceof Error ? e.message : 'Gagal memuat detail pembayaran',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeModal = () => {
        setShowDetailModal(false);
        setSelectedPayment(null);
    };

    const handleApprove = async (payment: PaymentRow) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Setujui Pembayaran?',
            html: `Anda akan menyetujui pembayaran sejumlah <strong>${formatCurrency(payment.amount)}</strong>.<br/>Apakah Anda yakin?`,
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Setujui',
            cancelButtonText: 'Batal',
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/admin/payments/${payment.id}/approve`, { method: 'POST' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal menyetujui pembayaran');

            closeModal();
            await Promise.all([fetchStats(), fetchPayments(pagination.page)]);

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: json.message || 'Pembayaran berhasil disetujui',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true,
            });
        } catch (e) {
            console.error('Approve error:', e);
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: e instanceof Error ? e.message : 'Gagal menyetujui pembayaran',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
        }
    };

    const handleReject = async (payment: PaymentRow) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Tolak Pembayaran?',
            html: `Anda akan menolak pembayaran sejumlah <strong>${formatCurrency(payment.amount)}</strong>.<br/>Silakan masukkan alasan penolakan (opsional):`,
            input: 'textarea',
            inputPlaceholder: 'Alasan penolakan...',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Tolak',
            cancelButtonText: 'Batal',
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/admin/payments/${payment.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: result.value || undefined }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal menolak pembayaran');

            closeModal();
            await Promise.all([fetchStats(), fetchPayments(pagination.page)]);

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: json.message || 'Pembayaran ditolak',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true,
            });
        } catch (e) {
            console.error('Reject error:', e);
            await Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: e instanceof Error ? e.message : 'Gagal menolak pembayaran',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK',
            });
        }
    };

    const applyFilters = async () => {
        await fetchPayments(1);
    };

    const getStatusBadge = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.PENDING:
                return 'bg-warning';
            case PaymentStatus.SETTLEMENT:
                return 'bg-success';
            case PaymentStatus.FAILURE:
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    const getStatusText = (status: PaymentStatus) => {
        switch (status) {
            case PaymentStatus.PENDING:
                return 'Menunggu';
            case PaymentStatus.SETTLEMENT:
                return 'Disetujui';
            case PaymentStatus.FAILURE:
                return 'Ditolak';
            case PaymentStatus.UNPAID:
                return 'Belum Dibayar';
            default:
                return status;
        }
    };

    if (status === 'loading' || (loading && !canLoad)) {
        return (
            <div className="py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted mt-2">Memuat...</p>
            </div>
        );
    }

    if (!canLoad) {
        return null;
    }

    return (
        <>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h1 className="h4 mb-0">Verifikasi Pembayaran</h1>
                    <small className="text-muted">Subscription Payments - SuperAdmin</small>
                </div>
            </div>

            {/* Stats Info Boxes */}
            <div className="row mb-3">
                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box">
                        <span className="info-box-icon bg-warning">
                            <i className="fas fa-clock"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Menunggu Verifikasi</span>
                            <span className="info-box-number">{stats.pending}</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box">
                        <span className="info-box-icon bg-success">
                            <i className="fas fa-check-circle"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Disetujui</span>
                            <span className="info-box-number">{stats.approved}</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box">
                        <span className="info-box-icon bg-danger">
                            <i className="fas fa-times-circle"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Ditolak</span>
                            <span className="info-box-number">{stats.rejected}</span>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                    <div className="info-box">
                        <span className="info-box-icon bg-info">
                            <i className="fas fa-list"></i>
                        </span>
                        <div className="info-box-content">
                            <span className="info-box-text">Total Pembayaran</span>
                            <span className="info-box-number">{stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    <div className="d-flex align-items-start">
                        <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                        <div className="flex-grow-1">
                            <div className="fw-bold">Error</div>
                            <div>{error}</div>
                            <button type="button" className="btn btn-primary btn-sm mt-2" onClick={() => fetchPayments(pagination.page)}>
                                <i className="fas fa-redo me-1"></i>
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-3">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-filter me-1"></i>
                        Filter
                    </h3>
                </div>
                <div className="card-body">
                    <div className="row g-2">
                        <div className="col-12 col-md-4">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter((e.target.value as any) || 'ALL')}
                            >
                                <option value="ALL">Semua</option>
                                <option value={PaymentStatus.PENDING}>Menunggu</option>
                                <option value={PaymentStatus.SETTLEMENT}>Disetujui</option>
                                <option value={PaymentStatus.FAILURE}>Ditolak</option>
                            </select>
                        </div>

                        <div className="col-12 col-md-8">
                            <label className="form-label">Cari</label>
                            <input
                                className="form-control"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari berdasarkan outlet..."
                            />
                        </div>
                    </div>

                    <div className="mt-3 d-flex gap-2">
                        <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters} disabled={loading}>
                            <i className="fas fa-search me-1"></i>
                            Terapkan
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setStatusFilter('ALL');
                                setSearch('');
                                void fetchPayments(1);
                            }}
                            disabled={loading}
                        >
                            <i className="fas fa-undo me-1"></i>
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-money-check-alt me-1"></i>
                        Daftar Pembayaran
                    </h3>
                    <div className="card-tools">
                        <span className="badge bg-info">{pagination.total} pembayaran</span>
                    </div>
                </div>
                <div className="card-body table-responsive p-0">
                    <table className="table table-striped table-hover text-nowrap mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Tanggal</th>
                                <th>ID Transaksi</th>
                                <th>Jumlah</th>
                                <th>Status</th>
                                <th>Bukti Transfer</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <div className="text-muted mt-2">Memuat pembayaran...</div>
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5 text-muted">
                                        Belum ada pembayaran sesuai filter
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id}>
                                        <td>{formatDateTime(p.createdAt)}</td>
                                        <td>
                                            <code className="small">{p.externalId || p.id.slice(0, 8)}</code>
                                        </td>
                                        <td className="fw-bold">{formatCurrency(p.amount)}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(p.status)}`}>
                                                {getStatusText(p.status)}
                                            </span>
                                        </td>
                                        <td>
                                            {p.proofUrl ? (
                                                <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                                    <i className="fas fa-image me-1"></i>
                                                    Lihat
                                                </a>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="btn-group btn-group-sm" role="group">
                                                <button
                                                    type="button"
                                                    className="btn btn-info"
                                                    onClick={() => viewDetails(p)}
                                                    title="Lihat Detail"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                {p.status === PaymentStatus.PENDING && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-success"
                                                            onClick={() => handleApprove(p)}
                                                            title="Setujui"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger"
                                                            onClick={() => handleReject(p)}
                                                            title="Tolak"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="card-footer d-flex align-items-center justify-content-between">
                    <small className="text-muted">
                        Halaman {pagination.page} dari {pagination.totalPages}
                    </small>
                    <div className="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={pagination.page <= 1 || loading}
                            onClick={() => void fetchPayments(pagination.page - 1)}
                        >
                            <i className="fas fa-chevron-left me-1"></i>
                            Prev
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={pagination.page >= pagination.totalPages || loading}
                            onClick={() => void fetchPayments(pagination.page + 1)}
                        >
                            Next
                            <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedPayment && (
                <>
                    <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="fas fa-file-invoice-dollar me-2"></i>
                                        Detail Pembayaran
                                    </h5>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={closeModal}></button>
                                </div>

                                <div className="modal-body">
                                    {detailLoading ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            <p className="text-muted mt-2">Memuat detail...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <div className="alert alert-info mb-0">
                                                        <strong>ID Transaksi:</strong> <code>{selectedPayment.externalId || selectedPayment.id}</code>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-bold">Jumlah</label>
                                                    <div className="fs-4 text-primary">{formatCurrency(selectedPayment.amount)}</div>
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-bold">Status</label>
                                                    <div>
                                                        <span className={`badge ${getStatusBadge(selectedPayment.status)} fs-6`}>
                                                            {getStatusText(selectedPayment.status)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {selectedPayment.package && (
                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label fw-bold">Paket Langganan</label>
                                                        <div className="fs-5">{selectedPayment.package.name}</div>
                                                        <small className="text-muted">Max Outlet: {selectedPayment.package.maxOutlets}</small>
                                                    </div>
                                                )}

                                                {selectedPayment.userSubscription && (
                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label fw-bold">Status Berjalan</label>
                                                        <div>
                                                            {selectedPayment.userSubscription.expiresAt && new Date(selectedPayment.userSubscription.expiresAt) > new Date() ? (
                                                                <span className="badge bg-success">Aktif</span>
                                                            ) : (
                                                                <span className="badge bg-secondary">Tidak Aktif</span>
                                                            )}
                                                        </div>
                                                        <div className="small text-muted mt-1">
                                                            Exp: {selectedPayment.userSubscription.expiresAt ? formatDateTime(selectedPayment.userSubscription.expiresAt) : '-'}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-bold">Tanggal Upload</label>
                                                    <div>{formatDateTime(selectedPayment.createdAt)}</div>
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-bold">Tanggal Verifikasi</label>
                                                    <div>{selectedPayment.verifiedAt ? formatDateTime(selectedPayment.verifiedAt) : <span className="text-muted">-</span>}</div>
                                                </div>

                                                {selectedPayment.proofUrl && (
                                                    <div className="col-12">
                                                        <label className="form-label fw-bold">Bukti Transfer</label>
                                                        <div className="mt-2">
                                                            <img
                                                                src={selectedPayment.proofUrl}
                                                                alt="Bukti Transfer"
                                                                className="img-fluid rounded border"
                                                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                                                            />
                                                        </div>
                                                        <div className="mt-2">
                                                            <a
                                                                href={selectedPayment.proofUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-sm btn-outline-primary"
                                                            >
                                                                <i className="fas fa-external-link-alt me-1"></i>
                                                                Buka di Tab Baru
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {!detailLoading && selectedPayment.status === PaymentStatus.PENDING && (
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                            Tutup
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => handleReject(selectedPayment)}
                                        >
                                            <i className="fas fa-times me-1"></i>
                                            Tolak
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={() => handleApprove(selectedPayment)}
                                        >
                                            <i className="fas fa-check me-1"></i>
                                            Setujui
                                        </button>
                                    </div>
                                )}

                                {!detailLoading && selectedPayment.status !== PaymentStatus.PENDING && (
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                            Tutup
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )
            }
        </>
    );
}
