"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';

interface Outlet {
    id: string;
    name: string;
    address: string;
    contactPhone?: string;
    slug: string;
    isPro: boolean;
}

export default function OutreachSettingsPage() {
    const { data: session } = useSession();
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        slug: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchOutlets();
    }, []);

    const fetchOutlets = async () => {
        try {
            const res = await fetch('/api/dashboard/outlets');
            const json = await res.json();
            if (json.success) {
                setOutlets(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch outlets', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingId
                ? `/api/dashboard/outlets/${editingId}`
                : '/api/dashboard/outlets';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || (editingId ? 'Gagal memperbarui outlet' : 'Gagal membuat outlet'));
            }

            Swal.fire('Berhasil', editingId ? 'Outlet berhasil diperbarui' : 'Outlet berhasil dibuat', 'success');
            setShowModal(false);
            resetForm();
            fetchOutlets();
        } catch (error: any) {
            Swal.fire('Gagal', error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', phone: '', slug: '' });
        setEditingId(null);
    };

    const handleCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (outlet: Outlet) => {
        setEditingId(outlet.id);
        setFormData({
            name: outlet.name,
            address: outlet.address,
            phone: outlet.contactPhone || '',
            slug: outlet.slug
        });
        setShowModal(true);
    };

    // Auto-generate slug from name
    const handleNameChange = (val: string) => {
        // Only auto-generate slug if we are creating a new outlet, OR if the user hasn't manually edited the slug yet (implied for simplicity here we just always update it for now, user can edit slug manually after)
        // Ideally we might want to decouple them in edit mode, but for now we'll keep the behavior consistent: changing name changes slug recommendation.
        const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        setFormData(prev => ({ ...prev, name: val, slug }));
    };

    if (loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0 text-dark fw-bold">Manajemen Outlet</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-end">
                                <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                                <li className="breadcrumb-item active">Outlets</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div className="content">
                <div className="container-fluid">

                    <div className="card shadow-sm border-0 rounded-3">
                        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 className="card-title m-0 fw-bold text-primary">
                                <i className="fas fa-store me-2"></i> Daftar Outlet Anda
                            </h5>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreate}
                            >
                                <i className="fas fa-plus me-2"></i> Tambah Outlet
                            </button>
                        </div>
                        <div className="card-body p-0 table-responsive">
                            <table className="table table-hover table-striped mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4">Nama Outlet</th>
                                        <th>Slug (URL)</th>
                                        <th>Alamat</th>
                                        <th>Telepon</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end pe-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outlets.map((outlet) => (
                                        <tr key={outlet.id}>
                                            <td className="ps-4 fw-semibold text-dark">{outlet.name}</td>
                                            <td><span className="badge bg-light text-dark border">{outlet.slug}</span></td>
                                            <td className="text-muted small">{outlet.address}</td>
                                            <td>{outlet.contactPhone || '-'}</td>
                                            <td className="text-center">
                                                <span className="badge bg-success">Aktif</span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button
                                                    className="btn btn-sm btn-outline-primary me-1"
                                                    onClick={() => handleEdit(outlet)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {outlets.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-5 text-muted">
                                                <i className="fas fa-store-slash fa-3x mb-3 opacity-50"></i>
                                                <p>Belum ada outlet. Silakan tambah outlet pertama Anda.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* Modal Create/Edit Outlet */}
            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title fw-bold">
                                        {editingId ? 'Edit Outlet' : 'Tambah Outlet Baru'}
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body p-4">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold small text-uppercase text-muted">Nama Outlet</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Contoh: Laundry Berkah Cabang 1"
                                                required
                                                value={formData.name}
                                                onChange={e => handleNameChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold small text-uppercase text-muted">Slug URL</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light text-muted">.../outlet/</span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="laundry-berkah-1"
                                                    required
                                                    value={formData.slug}
                                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                                />
                                            </div>
                                            <small className="text-muted">Digunakan untuk link website publik outlet Anda.</small>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold small text-uppercase text-muted">Nomor Telepon / WhatsApp</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="08123456789"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold small text-uppercase text-muted">Alamat Lengkap</label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                placeholder="Jl. Mawar No. 10..."
                                                required
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-footer bg-light">
                                        <button type="button" className="btn btn-link text-muted text-decoration-none" onClick={() => setShowModal(false)}>Batal</button>
                                        <button type="submit" className="btn btn-primary px-4" disabled={submitting}>
                                            {submitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Outlet')}
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
