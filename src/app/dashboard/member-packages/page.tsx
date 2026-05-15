'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

type MemberPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quota: number;
  type: 'KG' | 'PCS';
  expiryDays: number | null;
  isActive: boolean;
  createdAt: string;
};

export default function MemberPackagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const userRole = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<MemberPackage[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MemberPackage | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    quota: 0,
    type: 'KG' as 'KG' | 'PCS',
    expiryDays: '' as string | number,
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { update } = useSession();
  const [ownedOutlets, setOwnedOutlets] = useState<any[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);

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
      if (user?.outletId) {
        void fetchPackages();
      } else {
        setLoading(false);
        void fetchOwnedOutlets();
      }
    }
  }, [status, userRole, router, user?.outletId]);

  async function fetchOwnedOutlets() {
    try {
      setOutletsLoading(true);
      const res = await fetch('/api/dashboard/outlets');
      const json = await res.json();
      if (res.ok && json.success) {
        setOwnedOutlets(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch outlets", e);
    } finally {
      setOutletsLoading(false);
    }
  }

  async function handleSelectOutlet(outletId: string) {
    try {
      setOutletsLoading(true);
      await update({ outletId });
      // The useEffect will trigger fetchPackages
    } catch (e) {
      Swal.fire("Error", "Gagal memilih outlet", "error");
    } finally {
      setOutletsLoading(false);
    }
  }

  const toDigitsOnly = (val: string) => {
    const digits = val.replace(/\D/g, "");
    return digits.replace(/^0+/, "") || "0";
  };

  const sanitizeDecimal = (val: string) => {
    // allow only digits and one dot/comma
    const sanitized = val.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const parts = sanitized.split(".");
    let result = parts[0].replace(/^0+(?=\d)/, ""); // remove leading zeros but keep single 0
    if (result === "") result = "0";
    if (parts.length > 1) {
      result += "." + parts.slice(1).join("").substring(0, 2);
    }
    return result;
  };

  async function fetchPackages() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/member-packages');
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Gagal memuat daftar paket');
      }

      setPackages(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar paket');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      quota: 0,
      type: 'KG',
      expiryDays: '',
      isActive: true,
    });
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(pkg: MemberPackage) {
    setEditing(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      quota: pkg.quota,
      type: pkg.type,
      expiryDays: pkg.expiryDays || '',
      isActive: pkg.isActive,
    });
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (formLoading) return;
    setShowModal(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formLoading) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const isEdit = !!editing;
      const url = isEdit
        ? `/api/dashboard/member-packages/${editing!.id}`
        : '/api/dashboard/member-packages';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        price: Number(formData.price),
        quota: Number(formData.quota),
        expiryDays: formData.expiryDays === '' ? null : Number(formData.expiryDays),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Gagal menyimpan paket');
      }

      closeModal();
      await fetchPackages();
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: `Paket berhasil ${isEdit ? 'diperbarui' : 'dibuat'}`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Terjadi kesalahan');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(pkg: MemberPackage) {
    const result = await Swal.fire({
      title: 'Hapus Paket?',
      text: `Apakah Anda yakin ingin menghapus paket "${pkg.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/dashboard/member-packages/${pkg.id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Gagal menghapus paket');
      }

      await fetchPackages();
      Swal.fire('Terhapus!', 'Paket telah dihapus.', 'success');
    } catch (e) {
      Swal.fire('Error!', e instanceof Error ? e.message : 'Gagal menghapus paket', 'error');
    }
  }

  if (loading) {
    return (
      <div className="content-wrapper">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      {/* Outlet Selector Overlay for Global Mode */}
      {!user?.outletId && (
        <div 
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
          style={{ 
            zIndex: 1060, 
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(4px)"
          }}
        >
          <div className="card shadow-lg border-0" style={{ width: "90%", maxWidth: "450px" }}>
            <div className="card-body p-4 text-center">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 64, height: 64 }}>
                <i className="fas fa-store fa-2x"></i>
              </div>
              <h4 className="fw-bold mb-1">Pilih Outlet</h4>
              <p className="text-muted mb-4">Silakan pilih outlet untuk mengelola paket member.</p>
              
              {outletsLoading ? (
                <div className="py-4">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : (
                <div className="list-group text-start shadow-sm mb-3">
                  {ownedOutlets.map(outlet => (
                    <button 
                      key={outlet.id} 
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3"
                      onClick={() => handleSelectOutlet(outlet.id)}
                    >
                      <div>
                        <div className="fw-bold">{outlet.name}</div>
                        <div className="small text-muted">{outlet.address || "No address"}</div>
                      </div>
                      <i className="fas fa-chevron-right text-primary"></i>
                    </button>
                  ))}
                  {ownedOutlets.length === 0 && (
                    <div className="text-center py-4 text-muted">
                      Belum ada outlet yang terdaftar.
                    </div>
                  )}
                </div>
              )}
              
              <Link href="/dashboard" className="btn btn-link text-muted text-decoration-none">
                <i className="fas fa-arrow-left me-1"></i> Kembali ke Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Paket Member</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item"><Link href="/dashboard">Dashboard</Link></li>
                <li className="breadcrumb-item active">Paket Member</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row mb-3">
            <div className="col-12 text-end">
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="fas fa-plus me-1"></i> Tambah Paket
              </button>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h3 className="card-title">Daftar Paket Tersedia</h3>
            </div>
            <div className="card-body p-0">
              <ResponsiveTableToCards
                items={packages}
                getRowKey={(p) => p.id}
                columns={[
                  { header: 'Nama Paket', render: (p) => <span className="fw-bold text-primary">{p.name}</span> },
                  { header: 'Harga', render: (p) => formatCurrency(p.price) },
                  { header: 'Kuota', render: (p) => <span className="badge bg-info">{p.quota} {p.type}</span> },
                  { header: 'Masa Berlaku', render: (p) => p.expiryDays ? `${p.expiryDays} Hari` : 'Tanpa Batas' },
                  { 
                    header: 'Status', 
                    render: (p) => (
                      <span className={`badge ${p.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    ) 
                  },
                  {
                    header: 'Aksi',
                    render: (p) => (
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-warning" onClick={() => openEdit(p)} title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(p)} title="Hapus">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    )
                  }
                ]}
                renderMobileCard={(p) => (
                  <div key={p.id} className="card shadow-sm mb-2">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold text-primary">{p.name}</span>
                        <span className={`badge ${p.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Harga</span>
                        <span className="fw-bold">{formatCurrency(p.price)}</span>
                      </div>
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Kuota</span>
                        <span className="badge bg-info">{p.quota} {p.type}</span>
                      </div>
                      <div className="d-flex justify-content-between small mb-3">
                        <span className="text-muted">Berlaku</span>
                        <span>{p.expiryDays ? `${p.expiryDays} Hari` : 'Tanpa Batas'}</span>
                      </div>
                      <div className="d-grid gap-2">
                        <button className="btn btn-warning btn-sm" onClick={() => openEdit(p)}>
                          <i className="fas fa-edit me-1"></i> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                          <i className="fas fa-trash me-1"></i> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                emptyState={
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-box-open fa-3x mb-3 opacity-50"></i>
                    <p>Belum ada paket member yang dibuat.</p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow">
                <div className="modal-header">
                  <h5 className="modal-title">{editing ? 'Edit Paket' : 'Tambah Paket Baru'}</h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {formError && <div className="alert alert-danger">{formError}</div>}
                    <div className="mb-3">
                      <label className="form-label">Nama Paket</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.name} 
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="Contoh: Paket Hemat 10kg"
                        required
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Harga (Rp)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={formData.price.toLocaleString('id-ID')} 
                          onChange={e => setFormData(p => ({ ...p, price: Number(toDigitsOnly(e.target.value)) }))}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Jumlah Kuota</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={formData.quota.toString().replace('.', ',')} 
                          onChange={e => {
                            const val = sanitizeDecimal(e.target.value);
                            setFormData(p => ({ ...p, quota: Number(val) }));
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Tipe Kuota</label>
                        <select 
                          className="form-select" 
                          value={formData.type} 
                          onChange={e => setFormData(p => ({ ...p, type: e.target.value as 'KG' | 'PCS' }))}
                        >
                          <option value="KG">KG (Kiloan)</option>
                          <option value="PCS">PCS (Satuan)</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Masa Berlaku (Hari)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={formData.expiryDays} 
                          onChange={e => setFormData(p => ({ ...p, expiryDays: toDigitsOnly(e.target.value) }))}
                          placeholder="Kosongkan jika tdk terbatas"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Deskripsi (Opsional)</label>
                      <textarea 
                        className="form-control" 
                        value={formData.description} 
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        rows={2}
                      ></textarea>
                    </div>
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={formData.isActive}
                        onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                      />
                      <label className="form-check-label">Paket Aktif</label>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={formLoading}>
                      {formLoading ? 'Menyimpan...' : 'Simpan'}
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
