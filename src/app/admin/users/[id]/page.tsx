/**
 * Admin User Detail Page
 *
 * Minimal page untuk melihat detail user (SuperAdmin only).
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role } from '@/generated/prisma';
import { formatDateTime } from '@/lib/utils';

type OutletLite = { id: string; name: string; slug: string };
type UserDetail = {
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
  outlet: OutletLite | null;
};

export default function AdminUserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const userRole = (session?.user as any)?.role as Role | undefined;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (id) void fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userRole, id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal memuat user');
      setUser(json.data);
    } catch (e) {
      console.error('Fetch user error:', e);
      setError(e instanceof Error ? e.message : 'Gagal memuat user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (!user) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Reset PIN?',
      text: `Reset PIN untuk ${user.name} (${user.phone})?`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Reset',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-pin`, { method: 'POST' });
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
              html: `<div class="text-start"><p class="mb-2">${json.message || ''}</p><pre class="bg-light p-2 rounded small mb-0">${extra}</pre></div>`,
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

  const handleToggleActive = async () => {
    if (!user) return;
    const actionText = user.isActive ? 'nonaktifkan' : 'aktifkan';
    const result = await Swal.fire({
      icon: 'warning',
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} user?`,
      text: `Apakah Anda yakin ingin ${actionText} user ${user.name}?`,
      showCancelButton: true,
      confirmButtonColor: user.isActive ? '#d33' : '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Ya, ${actionText}`,
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || json.error || 'Gagal update status');
      await fetchUser();
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

  if (status === 'loading' || loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Memuat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <div className="d-flex align-items-start">
          <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
          <div className="flex-grow-1">
            <div className="fw-bold">Error</div>
            <div>{error}</div>
            <button type="button" className="btn btn-primary btn-sm mt-2" onClick={fetchUser}>
              <i className="fas fa-redo me-1"></i>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h4 mb-0">Detail User</h1>
          <small className="text-muted">{user.id}</small>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/users" className="btn btn-secondary btn-sm">
            <i className="fas fa-arrow-left me-1"></i>
            Kembali
          </Link>
          <button type="button" className="btn btn-info btn-sm" onClick={handleResetPin}>
            <i className="fas fa-key me-1"></i>
            Reset PIN
          </button>
          <button type="button" className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`} onClick={handleToggleActive}>
            <i className={`fas ${user.isActive ? 'fa-user-slash' : 'fa-user-check'} me-1`}></i>
            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-user me-1"></i>
            Informasi
          </h3>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="text-muted small">Nama</div>
              <div className="fw-bold">{user.name}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-muted small">WhatsApp</div>
              <div>
                <code>{user.phone}</code>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="text-muted small">Role</div>
              <span className={`badge ${user.role === Role.SUPERADMIN ? 'bg-danger' : user.role === Role.OWNER ? 'bg-primary' : 'bg-secondary'}`}>
                {user.role}
              </span>
            </div>
            <div className="col-12 col-md-4">
              <div className="text-muted small">Status</div>
              <span className={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>{user.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <div className="col-12 col-md-4">
              <div className="text-muted small">Outlet</div>
              <div>{user.outlet?.name || <span className="text-muted">-</span>}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-muted small">Login terakhir</div>
              <div>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <span className="text-muted">-</span>}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-muted small">PIN terakhir diubah</div>
              <div>{user.pinChangedAt ? formatDateTime(user.pinChangedAt) : <span className="text-muted">-</span>}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-muted small">Dibuat</div>
              <div>{formatDateTime(user.createdAt)}</div>
            </div>
            <div className="col-12 col-md-6">
              <div className="text-muted small">Diupdate</div>
              <div>{formatDateTime(user.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

