'use client';

/**
 * Staff Management Page (OWNER)
 *
 * Kelola akun STAFF untuk outlet aktif (session.outletId).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatDateTime } from '@/lib/utils';

type Staff = {
  id: string;
  phone: string;
  name: string;
  role: 'STAFF' | 'OWNER' | 'SUPERADMIN';
  outletId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function StaffManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const userRole = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pin: '',
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    pin?: string;
  }>({});

  const canOpen = useMemo(() => {
    if (status !== 'authenticated') return false;
    return userRole === 'OWNER';
  }, [status, userRole]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if (userRole !== 'OWNER') {
        router.push('/dashboard');
        return;
      }
      if (!user?.outletId) {
        setError('Outlet context required. Silakan hubungi admin.');
        setLoading(false);
        return;
      }
      void fetchStaff();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  async function fetchStaff() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/settings/staff', { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat daftar staff');
      }

      const list: Staff[] = Array.isArray(json.data) ? json.data : [];
      // Defensive: pastikan yang kita render hanya STAFF
      setStaff(list.filter((u) => u.role === 'STAFF'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar staff');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ name: '', phone: '', pin: '', isActive: true });
    setFormError(null);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(target: Staff) {
    setEditing(target);
    setFormData({
      name: target.name || '',
      phone: target.phone || '',
      pin: '',
      isActive: !!target.isActive,
    });
    setFormError(null);
    setFieldErrors({});
    setShowModal(true);
  }

  function closeModal() {
    if (formLoading) return;
    setShowModal(false);
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formLoading) return;

    const errs: { name?: string; phone?: string; pin?: string } = {};
    if (!formData.name.trim()) {
      errs.name = 'Nama harus diisi';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Nama minimal 2 karakter';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Nomor WhatsApp harus diisi';
    } else if (formData.phone.trim().replace(/\D/g, '').length < 8) {
      errs.phone = 'Nomor WhatsApp minimal 8 digit';
    }

    const isCreate = !editing;
    if (isCreate) {
      if (!/^\d{4,6}$/.test(formData.pin)) {
        errs.pin = 'PIN harus 4-6 digit';
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const firstField = Object.keys(errs)[0];
      const el = document.getElementById(firstField);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setFormLoading(true);

    try {
      const url = editing
        ? `/api/dashboard/settings/staff/${editing.id}`
        : '/api/dashboard/settings/staff';
      const method = editing ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim().replace(/\D/g, ''),
        isActive: !!formData.isActive,
      };
      if (!editing) payload.pin = formData.pin;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        if (Array.isArray(json?.errors)) {
          const fe: { name?: string; phone?: string; pin?: string } = {};
          for (const err of json.errors) {
            if (!err?.field || !err?.message) continue;
            const field = String(err.field);
            const msg = String(err.message);
            if (field === 'name') fe.name = msg;
            if (field === 'phone') fe.phone = msg;
            if (field === 'pin') fe.pin = msg;
          }
          if (Object.keys(fe).length > 0) {
            setFieldErrors(fe);
            return;
          }
        }
        throw new Error(json?.message || json?.error || 'Gagal menyimpan staff');
      }

      closeModal();
      await fetchStaff();

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: editing ? 'Staff berhasil diperbarui' : 'Staff berhasil dibuat',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan staff';
      setFormError(message);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: message,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setFormLoading(false);
    }
  }

  async function toggleActive(target: Staff) {
    const result = await Swal.fire({
      icon: 'warning',
      title: target.isActive ? 'Nonaktifkan Staff?' : 'Aktifkan Staff?',
      text: target.isActive
        ? 'Staff yang dinonaktifkan tidak bisa login.'
        : 'Staff akan bisa login kembali.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: target.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/dashboard/settings/staff/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memperbarui status staff');
      }

      await fetchStaff();

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: target.isActive ? 'Staff berhasil dinonaktifkan' : 'Staff berhasil diaktifkan',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal memperbarui status staff',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  if (!canOpen || status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Manajemen Staff</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat daftar staff...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Manajemen Staff</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link href="/dashboard/settings">Settings</Link>
                  </li>
                  <li className="breadcrumb-item active">Staff</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <h4 className="alert-heading">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Error!
              </h4>
              <p>{error}</p>
              <hr />
              <button className="btn btn-primary btn-sm" onClick={() => void fetchStaff()}>
                <i className="fas fa-redo me-1"></i>
                Coba Lagi
              </button>
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
              <h1 className="m-0">Manajemen Staff</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/settings">Settings</Link>
                </li>
                <li className="breadcrumb-item active">Staff</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="card card-warning card-outline shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex align-items-start gap-3">
                <div className="text-warning">
                  <i className="fas fa-shield-alt fa-2x"></i>
                </div>
                <div>
                  <div className="fw-semibold">Catatan keamanan</div>
                  <div className="text-muted">
                    Staff hanya berlaku untuk outlet aktif Anda. Role staff tidak bisa dinaikkan dari dashboard tenant.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-12">
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="fas fa-plus"></i> Tambah Staff
              </button>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-users me-2"></i>
                    Daftar Staff
                  </h3>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-striped table-hover text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Nama</th>
                        <th>WhatsApp</th>
                        <th>Status</th>
                        <th>Login Terakhir</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-users fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-2">Belum ada staff</p>
                              <p className="text-muted small mb-0">
                                Klik tombol "Tambah Staff" untuk membuat akun staff baru
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        staff.map((s) => (
                          <tr key={s.id}>
                            <td className="fw-semibold">{s.name}</td>
                            <td>
                              <code>{s.phone}</code>
                            </td>
                            <td>
                              <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {s.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td>{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : <span className="text-muted">-</span>}</td>
                            <td>{formatDateTime(s.createdAt)}</td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  onClick={() => openEdit(s)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${s.isActive ? 'btn-secondary' : 'btn-success'}`}
                                  onClick={() => void toggleActive(s)}
                                  title={s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  <i className={`fas ${s.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <Link href="/dashboard/settings" className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-arrow-left me-2"></i>
                    Kembali
                  </Link>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => void fetchStaff()}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`fas ${editing ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                    {editing ? 'Edit Staff' : 'Tambah Staff Baru'}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} disabled={formLoading} />
                </div>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="modal-body">
                    {formError && (
                      <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {formError}
                        <button type="button" className="btn-close" aria-label="Close" onClick={() => setFormError(null)} />
                      </div>
                    )}

                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">
                        <i className="fas fa-user me-1"></i>
                        Nama <span className="text-danger">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                        value={formData.name}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, name: e.target.value }));
                          if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                        }}
                        disabled={formLoading}
                        placeholder="Nama staff"
                        required
                      />
                      {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="phone" className="form-label">
                        <i className="fas fa-phone me-1"></i>
                        Nomor WhatsApp <span className="text-danger">*</span>
                      </label>
                      <input
                        id="phone"
                        type="text"
                        inputMode="numeric"
                        className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                        value={formData.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          setFormData((p) => ({ ...p, phone: digits }));
                          if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                        }}
                        disabled={formLoading}
                        placeholder="6281234567890"
                        required
                      />
                      {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                      <div className="form-text">Gunakan format 628xxxx (tanpa +, tanpa spasi).</div>
                    </div>

                    {!editing && (
                      <div className="mb-3">
                        <label htmlFor="pin" className="form-label">
                          <i className="fas fa-key me-1"></i>
                          PIN Awal <span className="text-danger">*</span>
                        </label>
                        <input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          className={`form-control ${fieldErrors.pin ? 'is-invalid' : ''}`}
                          value={formData.pin}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormData((p) => ({ ...p, pin: digits }));
                            if (fieldErrors.pin) setFieldErrors((p) => ({ ...p, pin: undefined }));
                          }}
                          disabled={formLoading}
                          placeholder="4-6 digit"
                          required
                        />
                        {fieldErrors.pin && <div className="invalid-feedback">{fieldErrors.pin}</div>}
                        <div className="form-text">
                          Berikan PIN ini ke staff. Staff dapat mengganti PIN sendiri di menu Settings → Ubah PIN.
                        </div>
                      </div>
                    )}

                    <div className="mb-3">
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
                          <i className="fas fa-toggle-on me-1"></i>
                          Aktifkan Akun
                        </label>
                      </div>
                      <div className="form-text">Jika dinonaktifkan, staff tidak bisa login.</div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={formLoading}>
                      <i className="fas fa-times me-1"></i>
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
    </div>
  );
}

