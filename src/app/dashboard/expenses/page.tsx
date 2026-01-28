
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatDateTime } from '@/lib/utils';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

type Expense = {
    id: string;
    description: string;
    amount: number;
    category: string | null;
    date: string;
    createdAt: string;
};

type ApiListResponse = {
    success: boolean;
    data?: Expense[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    error?: string;
    message?: string;
};

export default function ExpensesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const user = session?.user as any;
    const role = user?.role as string | undefined;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [items, setItems] = useState<Expense[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });

    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Operasional',
        date: new Date().toISOString().split('T')[0],
    });
    const [formLoading, setFormLoading] = useState(false);

    // Auth Guard
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            if (role !== 'OWNER' && role !== 'SUPERADMIN') {
                router.push('/dashboard');
            }
        }
    }, [status, router, role]);

    const canFetch = status === 'authenticated' && (role === 'OWNER' || role === 'SUPERADMIN');

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        return params.toString();
    }, [page, limit, startDate, endDate]);

    // Fetch Expenses
    useEffect(() => {
        if (!canFetch) return;
        async function fetchExpenses() {
            try {
                setLoading(true);
                const res = await fetch(`/api/dashboard/expenses?${queryString}`);
                const json = await res.json().catch(() => null);

                // Note: The API returns { total, expenses, ... } directly based on repository
                // It doesn't seem to wrap in { success: true, data: ... } based on my implementation of route.ts
                // Let's check route.ts again. 
                // Route.ts returns: return Response.json(result); where result is from repo.findAll
                // Repo.findAll returns: { total, expenses, page, limit, totalPages }

                if (!res.ok) {
                    throw new Error('Gagal memuat data pengeluaran');
                }

                setItems(json.expenses || []);
                setPagination({
                    total: json.total || 0,
                    page: json.page || 1,
                    limit: json.limit || 10,
                    totalPages: json.totalPages || 1,
                });

            } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal memuat data pengeluaran');
            } finally {
                setLoading(false);
            }
        }
        fetchExpenses();
    }, [canFetch, queryString, refreshKey]);

    // Handlers
    function handleCreate() {
        setFormData({
            description: '',
            amount: '',
            category: 'Operasional',
            date: new Date().toISOString().split('T')[0],
        });
        setShowModal(true);
    }

    async function handleDelete(id: string) {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Hapus Pengeluaran?',
            text: 'Data yang dihapus tidak dapat dikembalikan.',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#d33',
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/dashboard/expenses/${id}`, { method: 'DELETE' });

            if (!res.ok) {
                throw new Error('Gagal menghapus data');
            }

            await Swal.fire('Berhasil', 'Data berhasil dihapus', 'success');
            setRefreshKey((k) => k + 1);
        } catch (e) {
            Swal.fire('Error', e instanceof Error ? e.message : 'Gagal menghapus data', 'error');
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                description: formData.description,
                amount: Number(formData.amount),
                category: formData.category,
                date: new Date(formData.date).toISOString(),
            };

            const res = await fetch('/api/dashboard/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error('Gagal menyimpan data');
            }

            await Swal.fire('Berhasil', 'Data pengeluaran berhasil disimpan', 'success');
            setShowModal(false);
            setRefreshKey((k) => k + 1);
        } catch (e) {
            Swal.fire('Error', e instanceof Error ? e.message : 'Gagal menyimpan data', 'error');
        } finally {
            setFormLoading(false);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading && items.length === 0) {
        return (
            <div className="content-wrapper">
                <div className="content-header pt-3">
                    <div className="container-fluid">
                        <h1 className="m-0">Pengeluaran</h1>
                    </div>
                </div>
                <div className="content">
                    <div className="container-fluid text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            <div className="content-header pt-3">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Pengeluaran</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-end">
                                <li className="breadcrumb-item"><Link href="/dashboard">Dashboard</Link></li>
                                <li className="breadcrumb-item active">Pengeluaran</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content">
                <div className="container-fluid">
                    {error && (
                        <div className="alert alert-danger">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            {error}
                        </div>
                    )}

                    <div className="row mb-3 g-2 align-items-center">
                        <div className="col-12 col-md-auto">
                            <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                                <i className="fas fa-plus me-1"></i> Catat Pengeluaran
                            </button>
                        </div>
                        <div className="col-12 col-md-auto ms-md-auto">
                            <div className="d-flex gap-2">
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="align-self-center">-</span>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-header border-0">
                            <h3 className="card-title"><i className="fas fa-money-bill-wave me-2"></i> Riwayat Pengeluaran</h3>
                        </div>
                        <div className="card-body p-0">
                            <ResponsiveTableToCards
                                items={items}
                                getRowKey={(c) => c.id}
                                mobileContainerClassName="px-3 pt-2 pb-3"
                                columns={[
                                    { header: 'Tanggal', render: (c) => formatDateTime(c.date).split(',')[0] }, // Just date
                                    { header: 'Kategori', render: (c) => <span className="badge bg-secondary">{c.category || '-'}</span> },
                                    { header: 'Deskripsi', render: (c) => c.description },
                                    { header: 'Jumlah', render: (c) => <div className="fw-bold text-danger">{formatCurrency(c.amount)}</div> },
                                    {
                                        header: 'Aksi',
                                        render: (c) => (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)} title="Hapus">
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )
                                    }
                                ]}
                                emptyState={
                                    <div className="text-center py-5 text-muted">
                                        <i className="fas fa-money-bill-wave fa-3x mb-3 opacity-50"></i>
                                        <p>Belum ada data pengeluaran.</p>
                                    </div>
                                }
                                renderMobileCard={(c) => (
                                    <div className="card mb-3 shadow-sm border-start border-danger border-4">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <div className="text-muted small mb-1">{formatDateTime(c.date).split(',')[0]}</div>
                                                    <h5 className="fw-bold mb-0 text-danger">{formatCurrency(c.amount)}</h5>
                                                </div>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                            <div className="mb-1"><span className="badge bg-secondary me-2">{c.category || '-'}</span></div>
                                            <div className="text-dark">{c.description}</div>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                        <div className="card-footer d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Total: {pagination.total} • Hal {pagination.page}/{pagination.totalPages}
                            </small>
                            <div className="btn-group btn-group-sm">
                                <button
                                    className="btn btn-outline-secondary"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button
                                    className="btn btn-outline-secondary"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <>
                    <div className="modal fade show d-block bg-dark bg-opacity-50" tabIndex={-1}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Catat Pengeluaran</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label">Tanggal</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                value={formData.date}
                                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Kategori</label>
                                            <select
                                                className="form-select"
                                                value={formData.category}
                                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="Operasional">Operasional</option>
                                                <option value="Gaji">Gaji</option>
                                                <option value="Bahan Baku">Bahan Baku</option>
                                                <option value="Listrik & Air">Listrik & Air</option>
                                                <option value="Sewa">Sewa</option>
                                                <option value="Lainnya">Lainnya</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                placeholder="Contoh: Beli deterjen 5kg"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Jumlah (Rp) <span className="text-danger">*</span></label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                required
                                                min="0"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                        <button type="submit" className="btn btn-primary" disabled={formLoading}>
                                            {formLoading ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
