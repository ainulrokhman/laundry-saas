/**
 * Admin Users List Page
 *
 * SuperAdmin UI untuk kelola user:
 * - List + filter (role/outlet/status/search)
 * - Create/Update user
 * - Activate/Deactivate
 * - Reset PIN (kirim via WhatsApp best-effort)
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role } from '@/generated/prisma';
import { formatDateTime } from '@/lib/utils';

type OutletOption = {
  id: string;
  name: string;
  slug: string;
};

type UserRow = {
  id: string;
  phone: string;
  name: string;
  role: Role;
  outletId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  pinChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  outlet: OutletOption | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [outletFilter, setOutletFilter] = useState<string | 'ALL' | 'NULL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [search, setSearch] = useState('');

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    name?: string;
    role?: string;
    outletId?: string;
  }>({});

  const [formData, setFormData] = useState<{
    phone: string;
    name: string;
    role: Role;
    outletId: string | null;
    isActive: boolean;
    sendPinViaWhatsApp: boolean;
  }>({
    phone: '',
    name: '',
    role: Role.OWNER,
    outletId: null,
    isActive: true,
    sendPinViaWhatsApp: true,
  });

  const userRole = (session?.user as any)?.role as Role | undefined;

  const canLoad = status === 'authenticated' && userRole === Role.SUPERADMIN;

  const outletOptions = useMemo(() => {
    return outlets
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'id-ID'))
      .map((o) => ({ id: o.id, name: o.name, slug: o.slug }));
  }, [outlets]);

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

      void Promise.all([fetchOutlets(), fetchUsers(1)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userRole]);

  const buildUserQuery = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pagination.limit));

    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    if (outletFilter === 'NULL') params.set('outletId', 'null');
    if (outletFilter !== 'ALL' && outletFilter !== 'NULL') params.set('outletId', outletFilter);
    if (statusFilter === 'ACTIVE') params.set('isActive', 'true');
    if (statusFilter === 'INACTIVE') params.set('isActive', 'false');
    if (search.trim().length > 0) params.set('q', search.trim());

    return params.toString();
  };

  const fetchOutlets = async () => {
    try {
      const res = await fetch('/api/admin/outlets');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Gagal memuat outlet');
      setOutlets(json.data || []);
    } catch (e) {
      console.error('Fetch outlets error:', e);
      // Outlet list hanya untuk dropdown; jangan fail seluruh halaman
      setOutlets([]);
    }
  };

  const fetchUsers = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildUserQuery(page);
      const res = await fetch(`/api/admin/users?${qs}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Gagal memuat users');

      setUsers(json.data || []);
      if (json.pagination) setPagination(json.pagination);
    } catch (e) {
      console.error('Fetch users error:', e);
      setError(e instanceof Error ? e.message : 'Gagal memuat users');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFieldErrors({});
    setFormData({
      phone: '',
      name: '',
      role: Role.OWNER,
      outletId: outletOptions.length > 0 ? outletOptions[0].id : null,
      isActive: true,
      sendPinViaWhatsApp: true,
    });
    setShowModal(true);
  };

  const openEditModal = (u: UserRow) => {
    setEditingUser(u);
    setFieldErrors({});
    setFormData({
      phone: u.phone,
      name: u.name,
      role: u.role,
      outletId: u.role === Role.SUPERADMIN ? null : u.outletId,
      isActive: u.isActive,
      sendPinViaWhatsApp: false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (formLoading) return;
    setShowModal(false);
    setEditingUser(null);
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (!formData.phone.trim()) errs.phone = 'Nomor WhatsApp harus diisi';
    if (!formData.name.trim()) errs.name = 'Nama harus diisi';
    if (!formData.role) errs.role = 'Role harus dipilih';

    if (formData.role === Role.SUPERADMIN) {
      // outletId harus null
    } else {
      if (!formData.outletId) errs.outletId = 'Outlet wajib dipilih untuk role OWNER/STAFF';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const isEdit = !!editingUser;
      const url = isEdit ? `/api/admin/users/${editingUser!.id}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: any = {
        phone: formData.phone,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.role === Role.SUPERADMIN) {
        payload.outletId = null;
      } else {
        payload.outletId = formData.outletId;
      }

      if (!isEdit) payload.sendPinViaWhatsApp = formData.sendPinViaWhatsApp;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // map field errors jika ada
        if (json.errors && Array.isArray(json.errors)) {
          const next: typeof fieldErrors = {};
          json.errors.forEach((er: { field: string; message: string }) => {
            if (er.field === 'phone') next.phone = er.message;
            if (er.field === 'name') next.name = er.message;
            if (er.field === 'role') next.role = er.message;
            if (er.field === 'outletId') next.outletId = er.message;
          });
          if (Object.keys(next).length > 0) setFieldErrors(next);
        }
        throw new Error(json.message || json.error || 'Gagal menyimpan user');
      }

      closeModal();
      await fetchUsers(pagination.page);

      const extra =
        !isEdit && json.tempPin
          ? `\n\nPIN sementara (dev): ${json.tempPin}\n${json.waError ? `WA error: ${json.waError}` : ''}`
          : '';

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `${json.message || (isEdit ? 'User berhasil diperbarui' : 'User berhasil dibuat')}${extra ? '' : ''}`,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        ...(extra
          ? {
              html: `<div class="text-start"><p class="mb-2">${json.message || ''}</p><pre class="bg-light p-2 rounded small mb-0">${extra.trim()}</pre></div>`,
            }
          : {}),
      });
    } catch (e) {
      console.error('Save user error:', e);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal menyimpan user',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPin = async (u: UserRow) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reset PIN?',
      text: `Reset PIN untuk ${u.name} (${u.phone})? PIN baru akan dikirim via WhatsApp (jika terkonfigurasi).`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-pin`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal reset PIN');

      const extra =
        json.tempPin ? `PIN baru (dev): ${json.tempPin}\n${json.waError ? `WA error: ${json.waError}` : ''}` : '';

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        ...(extra
          ? {
              html: `<div class="text-start"><p class="mb-2">${json.message || 'PIN berhasil direset'}</p><pre class="bg-light p-2 rounded small mb-0">${extra}</pre></div>`,
            }
          : { text: json.message || 'PIN berhasil direset' }),
      });
    } catch (e) {
      console.error('Reset PIN error:', e);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal reset PIN',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleToggleActive = async (u: UserRow) => {
    const actionText = u.isActive ? 'nonaktifkan' : 'aktifkan';
    const result = await Swal.fire({
      icon: 'warning',
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} user?`,
      text: `Apakah Anda yakin ingin ${actionText} user ${u.name}?`,
      showCancelButton: true,
      confirmButtonColor: u.isActive ? '#d33' : '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Ya, ${actionText}`,
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal update status');

      await fetchUsers(pagination.page);

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: json.message || 'Status user berhasil diperbarui',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (e) {
      console.error('Toggle active error:', e);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal update status',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  };

  const applyFilters = async () => {
    await fetchUsers(1);
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
          <h1 className="h4 mb-0">Kelola Users</h1>
          <small className="text-muted">SuperAdmin</small>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
          <i className="fas fa-plus me-1"></i>
          Tambah User
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <div className="d-flex align-items-start">
            <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
            <div className="flex-grow-1">
              <div className="fw-bold">Error</div>
              <div>{error}</div>
              <button type="button" className="btn btn-primary btn-sm mt-2" onClick={() => fetchUsers(pagination.page)}>
                <i className="fas fa-redo me-1"></i>
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-filter me-1"></i>
            Filter
          </h3>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter((e.target.value as any) || 'ALL')}
              >
                <option value="ALL">Semua</option>
                <option value={Role.SUPERADMIN}>SUPERADMIN</option>
                <option value={Role.OWNER}>OWNER</option>
                <option value={Role.STAFF}>STAFF</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Outlet</label>
              <select
                className="form-select"
                value={outletFilter}
                onChange={(e) => setOutletFilter((e.target.value as any) || 'ALL')}
              >
                <option value="ALL">Semua</option>
                <option value="NULL">(Tanpa outlet / SuperAdmin)</option>
                {outletOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">Semua</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Cari</label>
              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / WhatsApp"
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
                setRoleFilter('ALL');
                setOutletFilter('ALL');
                setStatusFilter('ALL');
                setSearch('');
                void fetchUsers(1);
              }}
              disabled={loading}
            >
              <i className="fas fa-undo me-1"></i>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-users me-1"></i>
            Daftar Users
          </h3>
          <div className="card-tools">
            <span className="badge bg-info">{pagination.total} user</span>
          </div>
        </div>
        <div className="card-body table-responsive p-0">
          <table className="table table-striped table-hover text-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Nama</th>
                <th>WhatsApp</th>
                <th>Role</th>
                <th>Outlet</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="text-muted mt-2">Memuat users...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    Belum ada user sesuai filter
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="text-decoration-none fw-bold">
                        {u.name}
                      </Link>
                    </td>
                    <td>
                      <code>{u.phone}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === Role.SUPERADMIN ? 'bg-danger' : u.role === Role.OWNER ? 'bg-primary' : 'bg-secondary'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{u.outlet?.name || <span className="text-muted">-</span>}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="text-muted">-</span>}</td>
                    <td>{formatDateTime(u.createdAt)}</td>
                    <td>
                      <div className="btn-group btn-group-sm" role="group">
                        <button type="button" className="btn btn-warning" onClick={() => openEditModal(u)} title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button type="button" className="btn btn-info" onClick={() => handleResetPin(u)} title="Reset PIN">
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          type="button"
                          className={`btn ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          <i className={`fas ${u.isActive ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                        </button>
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
              onClick={() => void fetchUsers(pagination.page - 1)}
            >
              <i className="fas fa-chevron-left me-1"></i>
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => void fetchUsers(pagination.page + 1)}
            >
              Next
              <i className="fas fa-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`fas ${editingUser ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                    {editingUser ? 'Edit User' : 'Tambah User'}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} disabled={formLoading}></button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="modal-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Nomor WhatsApp <span className="text-danger">*</span>
                        </label>
                        <input
                          className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                          value={formData.phone}
                          onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="Contoh: 0812xxxx atau 62812xxxx"
                          disabled={formLoading}
                        />
                        {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Nama <span className="text-danger">*</span>
                        </label>
                        <input
                          className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                          value={formData.name}
                          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Nama user"
                          disabled={formLoading}
                        />
                        {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Role <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${fieldErrors.role ? 'is-invalid' : ''}`}
                          value={formData.role}
                          onChange={(e) => {
                            const nextRole = e.target.value as Role;
                            setFormData((p) => ({
                              ...p,
                              role: nextRole,
                              outletId: nextRole === Role.SUPERADMIN ? null : p.outletId ?? (outletOptions[0]?.id ?? null),
                            }));
                          }}
                          disabled={formLoading}
                        >
                          <option value={Role.OWNER}>OWNER</option>
                          <option value={Role.STAFF}>STAFF</option>
                          <option value={Role.SUPERADMIN}>SUPERADMIN</option>
                        </select>
                        {fieldErrors.role && <div className="invalid-feedback">{fieldErrors.role}</div>}
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Outlet {formData.role === Role.SUPERADMIN ? <span className="text-muted">(tidak berlaku)</span> : <span className="text-danger">*</span>}
                        </label>
                        <select
                          className={`form-select ${fieldErrors.outletId ? 'is-invalid' : ''}`}
                          value={formData.outletId ?? ''}
                          onChange={(e) => setFormData((p) => ({ ...p, outletId: e.target.value || null }))}
                          disabled={formLoading || formData.role === Role.SUPERADMIN}
                        >
                          <option value="">Pilih outlet...</option>
                          {outletOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.outletId && <div className="invalid-feedback">{fieldErrors.outletId}</div>}
                      </div>

                      <div className="col-12">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                            disabled={formLoading}
                          />
                          <label className="form-check-label" htmlFor="isActive">
                            User aktif
                          </label>
                        </div>
                      </div>

                      {!editingUser && (
                        <div className="col-12">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="sendPinViaWhatsApp"
                              checked={formData.sendPinViaWhatsApp}
                              onChange={(e) => setFormData((p) => ({ ...p, sendPinViaWhatsApp: e.target.checked }))}
                              disabled={formLoading}
                            />
                            <label className="form-check-label" htmlFor="sendPinViaWhatsApp">
                              Kirim PIN via WhatsApp (disarankan)
                            </label>
                          </div>
                          <small className="text-muted d-block">
                            Jika WA belum terkonfigurasi, API akan mengembalikan PIN sementara hanya pada mode development.
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={formLoading}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={formLoading}>
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          Simpan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </>
  );
}

