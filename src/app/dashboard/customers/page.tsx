
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatDateTime } from '@/lib/utils';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

type Customer = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    createdAt: string;
    updatedAt: string;
};

type ApiListResponse = {
    success: boolean;
    data?: Customer[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    error?: string;
    message?: string;
};

export default function CustomersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const user = session?.user as any;
    const role = user?.role as string | undefined;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [items, setItems] = useState<Customer[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });

    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    });
    const [formLoading, setFormLoading] = useState(false);

    // Auth Guard
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            if (role !== 'OWNER' && role !== 'STAFF') {
                router.push('/dashboard');
            } else if (!user?.outletId) {
                setError('Outlet context required.');
                setLoading(false);
            }
        }
    }, [status, router, role, user?.outletId]);

    const canFetch = status === 'authenticated' && (role === 'OWNER' || role === 'STAFF') && !!user?.outletId;

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (query.trim()) params.set('search', query.trim());
        params.set('page', String(page));
        params.set('limit', String(limit));
        return params.toString();
    }, [query, page, limit]);

    // Fetch Customers
    useEffect(() => {
        if (!canFetch) return;
        async function fetchCustomers() {
            try {
                setLoading(true);
                const res = await fetch(`/api/dashboard/customers?${queryString}`);
                const json = (await res.json().catch(() => null)) as ApiListResponse | null;

                if (!res.ok || !json?.success) {
                    throw new Error(json?.message || json?.error || 'Gagal memuat data pelanggan');
                }

                setItems(json.data || []);
                if (json.meta) {
                    setPagination(json.meta);
                    // setPage(json.meta.page); // Don't force setPage here to avoid loop if logic differs, trust meta
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal memuat data pelanggan');
            } finally {
                setLoading(false);
            }
        }
        fetchCustomers();
    }, [canFetch, queryString, refreshKey]);

    // Handlers
    function handleCreate() {
        setEditingItem(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
        setShowModal(true);
    }

    function handleEdit(item: Customer) {
        setEditingItem(item);
        setFormData({
            name: item.name,
            phone: item.phone || '',
            email: item.email || '',
            address: item.address || '',
        });
        setShowModal(true);
    }

    async function handleDelete(id: string) {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Hapus Pelanggan?',
            text: 'Data yang dihapus tidak dapat dikembalikan.',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#d33',
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`/api/dashboard/customers/${id}`, { method: 'DELETE' });
            const json = await res.json().catch(() => null);

            if (!res.ok || !json?.success) {
                throw new Error(json?.message || json?.error || 'Gagal menghapus pelanggan');
            }

            await Swal.fire('Berhasil', 'Pelanggan berhasil dihapus', 'success');
            setRefreshKey((k) => k + 1);
        } catch (e) {
            Swal.fire('Error', e instanceof Error ? e.message : 'Gagal menghapus pelanggan', 'error');
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);
        try {
            const url = editingItem
                ? `/api/dashboard/customers/${editingItem.id}`
                : '/api/dashboard/customers';
            const method = editingItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const json = await res.json().catch(() => null);

            if (!res.ok || !json?.success) {
                throw new Error(json?.message || json?.error || 'Gagal menyimpan data');
            }

            await Swal.fire('Berhasil', 'Data pelanggan berhasil disimpan', 'success');
            setShowModal(false);
            setRefreshKey((k) => k + 1);
        } catch (e) {
            Swal.fire('Error', e instanceof Error ? e.message : 'Gagal menyimpan data', 'error');
        } finally {
            setFormLoading(false);
        }
    }

    if (loading && items.length === 0) {
        return (
            <div className="content-wrapper">
                <div className="content-header pt-3">
                    <div className="container-fluid">
                        <h1 className="m-0">Pelanggan</h1>
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
                            <h1 className="m-0">Pelanggan</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-end">
                                <li className="breadcrumb-item"><Link href="/dashboard">Dashboard</Link></li>
                                <li className="breadcrumb-item active">Pelanggan</li>
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

                    <div className="row mb-3 g-2">
                        <div className="col-12 col-md-auto">
                            <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                                <i className="fas fa-plus me-1"></i> Tambah Pelanggan
                            </button>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text"><i className="fas fa-search"></i></span>
                                <input
                                    className="form-control"
                                    placeholder="Cari nama atau telepon..."
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-header border-0">
                            <h3 className="card-title"><i className="fas fa-users me-2"></i> Daftar Pelanggan</h3>
                        </div>
                        <div className="card-body p-0">
                            <ResponsiveTableToCards
                                items={items}
                                getRowKey={(c) => c.id}
                                mobileContainerClassName="px-3 pt-2 pb-3"
                                columns={[
                                    { header: 'Nama', render: (c) => <div className="fw-semibold">{c.name}</div> },
                                    { header: 'Telepon', render: (c) => c.phone || <em className="text-muted">-</em> },
                                    { header: 'Alamat', render: (c) => <div className="text-truncate" style={{ maxWidth: '200px' }} title={c.address || ''}>{c.address || <em className="text-muted">-</em>}</div> },
                                    { header: 'Terdaftar', render: (c) => formatDateTime(c.createdAt) },
                                    {
                                        header: 'Aksi',
                                        render: (c) => (
                                            <div className="btn-group btn-group-sm">
                                                <Link
                                                    href={`/dashboard/customers/${c.id}`}
                                                    className="btn btn-info text-white"
                                                    title="Detail"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </Link>
                                                <button className="btn btn-warning" onClick={() => handleEdit(c)} title="Edit">
                                                    <i className="fas fa-pencil-alt"></i>
                                                </button>
                                                <button className="btn btn-danger" onClick={() => handleDelete(c.id)} title="Hapus">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        )
                                    }
                                ]}
                                emptyState={
                                    <div className="text-center py-5 text-muted">
                                        <i className="fas fa-users fa-3x mb-3 opacity-50"></i>
                                        <p>Belum ada pelanggan ditemukan.</p>
                                    </div>
                                }
                                renderMobileCard={(c) => (
                                    <div className="card mb-3 shadow-sm">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <h5 className="fw-bold mb-0">{c.name}</h5>
                                                <div className="btn-group btn-group-sm">
                                                    <Link
                                                        href={`/dashboard/customers/${c.id}`}
                                                        className="btn btn-outline-info"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </Link>
                                                    <button className="btn btn-outline-warning" onClick={() => handleEdit(c)}>
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mb-1"><i className="fas fa-phone-alt me-2 text-muted" style={{ width: '20px' }}></i> {c.phone || '-'}</div>
                                            <div className="mb-1"><i className="fas fa-map-marker-alt me-2 text-muted" style={{ width: '20px' }}></i> {c.address || '-'}</div>
                                            <div className="text-muted small mt-2 pt-2 border-top">
                                                Terdaftar: {formatDateTime(c.createdAt)}
                                            </div>
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
                                    <h5 className="modal-title">{editingItem ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="mb-3">
                                            <label className="form-label">Nama <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Nomor Telepon / WhatsApp</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="e.g 08123456789"
                                                value={formData.phone}
                                                onChange={e => {
                                                    // Allow only numbers
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setFormData({ ...formData, phone: val });
                                                }}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Email (Opsional)</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Alamat (Opsional)</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            ></textarea>
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
