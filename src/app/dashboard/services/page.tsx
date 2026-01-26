'use client';

/**
 * Service Management Page (OWNER)
 *
 * Kelola layanan (kiloan/satuan/paket) untuk outlet aktif (session.outletId).
 * Tanpa DataTables plugin: search/filter/sort/pagination dilakukan via React state.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

type ServiceType = 'KILOAN' | 'SATUAN' | 'PAKET';

type Service = {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  unit: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SortKey = 'createdAt' | 'name' | 'price';

function typeLabel(type: ServiceType): string {
  if (type === 'KILOAN') return 'Kiloan';
  if (type === 'SATUAN') return 'Satuan';
  return 'Paket';
}

function typeBadgeClass(type: ServiceType): string {
  if (type === 'KILOAN') return 'bg-primary';
  if (type === 'SATUAN') return 'bg-info';
  return 'bg-warning';
}

function defaultUnit(type: ServiceType): string {
  if (type === 'KILOAN') return 'kg';
  if (type === 'SATUAN') return 'pcs';
  return 'paket';
}

export default function ServiceManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const userRole = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | ServiceType>('ALL');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    type?: string;
    price?: string;
    unit?: string;
    description?: string;
  }>({});

  const [form, setForm] = useState<{
    name: string;
    type: ServiceType;
    price: string;
    unit: string;
    description: string;
    isActive: boolean;
  }>({
    name: '',
    type: 'KILOAN',
    price: '',
    unit: defaultUnit('KILOAN'),
    description: '',
    isActive: true,
  });

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
      void fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  async function fetchServices() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/services', { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat daftar layanan');
      }

      const list: Service[] = Array.isArray(json.data) ? json.data : [];
      setServices(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar layanan');
    } finally {
      setLoading(false);
    }
  }

  const processed = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...services];

    if (q) {
      list = list.filter((s) => {
        const hay = `${s.name} ${s.description ?? ''} ${s.unit ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (filterType !== 'ALL') {
      list = list.filter((s) => s.type === filterType);
    }

    if (filterActive !== 'ALL') {
      list = list.filter((s) => (filterActive === 'ACTIVE' ? s.isActive : !s.isActive));
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      if (sortKey === 'price') cmp = (a.price ?? 0) - (b.price ?? 0);
      if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return {
      total,
      totalPages,
      page: safePage,
      items: list.slice(start, end),
    };
  }, [services, query, filterType, filterActive, sortKey, sortDir, page, pageSize]);

  useEffect(() => {
    // sinkronkan state page dengan safePage (menghindari page out-of-range yang bikin pagination terasa tidak berubah)
    if (page !== processed.page) {
      setPage(processed.page);
    }
  }, [page, processed.page]);

  useEffect(() => {
    // reset page when filters change
    setPage(1);
  }, [query, filterType, filterActive, sortKey, sortDir, pageSize]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      type: 'KILOAN',
      price: '',
      unit: defaultUnit('KILOAN'),
      description: '',
      isActive: true,
    });
    setFormError(null);
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(target: Service) {
    setEditing(target);
    setForm({
      name: target.name ?? '',
      type: target.type,
      price: String(target.price ?? ''),
      unit: target.unit ?? defaultUnit(target.type),
      description: target.description ?? '',
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

  function setFormField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formLoading) return;

    const errs: typeof fieldErrors = {};
    const name = form.name.trim();
    if (!name) errs.name = 'Nama layanan harus diisi';
    else if (name.length < 2) errs.name = 'Nama layanan minimal 2 karakter';

    if (!form.type) errs.type = 'Kategori harus dipilih';

    const priceNum = Number(String(form.price).replace(/,/g, '.'));
    if (String(form.price).trim().length === 0) errs.price = 'Harga harus diisi';
    else if (!Number.isFinite(priceNum)) errs.price = 'Harga tidak valid';
    else if (priceNum < 0) errs.price = 'Harga tidak boleh negatif';

    const unit = form.unit.trim();
    if (unit.length > 20) errs.unit = 'Unit maksimal 20 karakter';

    const desc = form.description.trim();
    if (desc.length > 500) errs.description = 'Deskripsi maksimal 500 karakter';

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
      const isCreate = !editing;
      const url = isCreate ? '/api/dashboard/services' : `/api/dashboard/services/${editing!.id}`;
      const method = isCreate ? 'POST' : 'PUT';

      const payload: any = {
        name,
        type: form.type,
        price: priceNum,
        unit: unit || undefined,
        description: desc || undefined,
        isActive: !!form.isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        if (Array.isArray(json?.errors)) {
          const fe: typeof fieldErrors = {};
          for (const err of json.errors) {
            if (!err?.field || !err?.message) continue;
            const field = String(err.field);
            const msg = String(err.message);
            if (field === 'name') fe.name = msg;
            if (field === 'type') fe.type = msg;
            if (field === 'price') fe.price = msg;
            if (field === 'unit') fe.unit = msg;
            if (field === 'description') fe.description = msg;
          }
          if (Object.keys(fe).length > 0) {
            setFieldErrors(fe);
            return;
          }
        }
        throw new Error(json?.message || json?.error || 'Gagal menyimpan layanan');
      }

      closeModal();
      await fetchServices();

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: isCreate ? 'Layanan berhasil dibuat' : 'Layanan berhasil diperbarui',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan layanan';
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

  async function handleDelete(target: Service) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Layanan?',
      text: 'Tindakan ini tidak dapat dibatalkan.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/dashboard/services/${target.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal menghapus layanan');
      }

      await fetchServices();
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Layanan berhasil dihapus',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal menghapus layanan',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  async function toggleActive(target: Service) {
    const result = await Swal.fire({
      icon: 'warning',
      title: target.isActive ? 'Nonaktifkan Layanan?' : 'Aktifkan Layanan?',
      text: target.isActive
        ? 'Layanan yang dinonaktifkan tidak akan muncul sebagai layanan aktif.'
        : 'Layanan akan kembali aktif.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: target.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/dashboard/services/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !target.isActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memperbarui status layanan');
      }

      await fetchServices();
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: target.isActive ? 'Layanan berhasil dinonaktifkan' : 'Layanan berhasil diaktifkan',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1200,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Gagal memperbarui status layanan',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Manajemen Layanan</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat daftar layanan...</p>
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
                <h1 className="m-0">Manajemen Layanan</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item active">Layanan</li>
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
              <button className="btn btn-primary btn-sm" onClick={() => void fetchServices()}>
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
              <h1 className="m-0">Manajemen Layanan</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Layanan</li>
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
                  <i className="fas fa-tags fa-2x"></i>
                </div>
                <div>
                  <div className="fw-semibold">Catatan</div>
                  <div className="text-muted">
                    Layanan hanya berlaku untuk outlet aktif Anda. Gunakan kategori (Kiloan/Satuan/Paket) untuk memudahkan input order.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb-3 g-2 align-items-end">
            <div className="col-12 col-md-auto">
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="fas fa-plus"></i> Tambah Layanan
              </button>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted mb-1" htmlFor="query">
                Pencarian
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  id="query"
                  className="form-control"
                  placeholder="Cari nama / deskripsi / unit..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim().length > 0 && (
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setQuery('')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="filterType">
                Kategori
              </label>
              <select
                id="filterType"
                className="form-select form-select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">Semua</option>
                <option value="KILOAN">Kiloan</option>
                <option value="SATUAN">Satuan</option>
                <option value="PAKET">Paket</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="filterActive">
                Status
              </label>
              <select
                id="filterActive"
                className="form-select form-select-sm"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as any)}
              >
                <option value="ALL">Semua</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="sortKey">
                Urutkan
              </label>
              <select
                id="sortKey"
                className="form-select form-select-sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="createdAt">Terbaru</option>
                <option value="name">Nama</option>
                <option value="price">Harga</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="sortDir">
                Arah
              </label>
              <select
                id="sortDir"
                className="form-select form-select-sm"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
              >
                <option value="desc">Menurun</option>
                <option value="asc">Menaik</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-concierge-bell me-2"></i>
                    Daftar Layanan
                  </h3>
                  <div className="card-tools d-flex align-items-center gap-2">
                    <span className="text-muted small">
                      Total: <span className="fw-semibold">{processed.total}</span>
                    </span>
                    <button className="btn btn-tool" type="button" onClick={() => void fetchServices()} title="Refresh">
                      <i className="fas fa-sync-alt"></i>
                    </button>
                  </div>
                </div>

                <div className="card-body p-0">
                  <div className="d-md-none px-3 pt-3 pb-0">
                    <div className="text-muted small">
                      Menampilkan <span className="fw-semibold">{processed.items.length}</span> dari{' '}
                      <span className="fw-semibold">{processed.total}</span> • Hal{' '}
                      <span className="fw-semibold">{processed.page}</span>/
                      <span className="fw-semibold">{processed.totalPages}</span>
                    </div>
                  </div>
                  <ResponsiveTableToCards
                    items={processed.items}
                    getRowKey={(s) => s.id}
                    mobileContainerClassName="px-3 pt-2 pb-3"
                    columns={[
                      {
                        header: 'Nama',
                        render: (s) => (
                          <div className="fw-semibold">
                            {s.name}
                            {s.description ? (
                              <div className="text-muted small text-wrap mt-1">{s.description}</div>
                            ) : null}
                          </div>
                        ),
                      },
                      {
                        header: 'Kategori',
                        render: (s) => <span className={`badge ${typeBadgeClass(s.type)}`}>{typeLabel(s.type)}</span>,
                      },
                      { header: 'Harga', render: (s) => formatCurrency(s.price) },
                      {
                        header: 'Unit',
                        render: (s) => (s.unit ? <code>{s.unit}</code> : <span className="text-muted">-</span>),
                      },
                      {
                        header: 'Status',
                        render: (s) => (
                          <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                            {s.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        ),
                      },
                      { header: 'Dibuat', render: (s) => formatDateTime(s.createdAt) },
                      {
                        header: 'Aksi',
                        render: (s) => (
                          <div className="btn-group btn-group-sm" role="group">
                            <button type="button" className="btn btn-warning" onClick={() => openEdit(s)} title="Edit">
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
                            <button type="button" className="btn btn-danger" onClick={() => void handleDelete(s)} title="Hapus">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    emptyState={
                      <div className="text-center py-4">
                        <div className="empty-state">
                          <i className="fas fa-concierge-bell fa-3x text-muted mb-3"></i>
                          <p className="text-muted mb-2">Belum ada layanan</p>
                          <p className="text-muted small mb-0">
                            Klik tombol "Tambah Layanan" untuk menambahkan layanan baru
                          </p>
                        </div>
                      </div>
                    }
                    renderMobileCard={(s) => (
                      <div key={s.id} className="card shadow-sm">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <div className="fw-semibold">{s.name}</div>
                              {s.description ? (
                                <div className="text-muted small mt-1 text-truncate">{s.description}</div>
                              ) : null}
                            </div>
                            <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {s.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mt-3">
                            <span className={`badge ${typeBadgeClass(s.type)}`}>{typeLabel(s.type)}</span>
                            {s.unit ? <span className="badge bg-light text-dark">{s.unit}</span> : null}
                          </div>

                          <hr className="my-3" />

                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="text-muted small">Harga</div>
                              <div className="fw-semibold">{formatCurrency(s.price)}</div>
                            </div>
                            <div className="text-end">
                              <div className="text-muted small">Dibuat</div>
                              <div className="fw-semibold">{formatDateTime(s.createdAt)}</div>
                            </div>
                          </div>

                          <div className="d-grid gap-2 mt-3">
                            <button type="button" className="btn btn-warning btn-sm" onClick={() => openEdit(s)}>
                              <i className="fas fa-edit me-1"></i>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${s.isActive ? 'btn-secondary' : 'btn-success'}`}
                              onClick={() => void toggleActive(s)}
                            >
                              <i className={`fas ${s.isActive ? 'fa-toggle-on' : 'fa-toggle-off'} me-1`}></i>
                              {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => void handleDelete(s)}>
                              <i className="fas fa-trash me-1"></i>
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>

                <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-muted small">
                      Halaman <span className="fw-semibold">{processed.page}</span> dari{' '}
                      <span className="fw-semibold">{processed.totalPages}</span>
                    </span>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Pagination">
                      <button className="btn btn-outline-secondary" disabled={processed.page <= 1} onClick={() => setPage(1)}>
                        <i className="fas fa-angle-double-left"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        disabled={processed.page <= 1}
                        onClick={() => setPage(Math.max(1, processed.page - 1))}
                      >
                        <i className="fas fa-angle-left"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        disabled={processed.page >= processed.totalPages}
                        onClick={() => setPage(Math.min(processed.totalPages, processed.page + 1))}
                      >
                        <i className="fas fa-angle-right"></i>
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        disabled={processed.page >= processed.totalPages}
                        onClick={() => setPage(processed.totalPages)}
                      >
                        <i className="fas fa-angle-double-right"></i>
                      </button>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <label className="text-muted small mb-0" htmlFor="pageSize">
                      Baris/halaman
                    </label>
                    <select
                      id="pageSize"
                      className="form-select form-select-sm w-auto"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <Link href="/dashboard" className="btn btn-outline-secondary btn-sm">
                      <i className="fas fa-arrow-left me-2"></i>
                      Kembali
                    </Link>
                  </div>
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
                    {editing ? 'Edit Layanan' : 'Tambah Layanan Baru'}
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

                    <div className="row g-3">
                      <div className="col-12">
                        <label htmlFor="name" className="form-label">
                          <i className="fas fa-tag me-1"></i>
                          Nama Layanan <span className="text-danger">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                          value={form.name}
                          onChange={(e) => {
                            setFormField('name', e.target.value);
                            if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                          }}
                          disabled={formLoading}
                          placeholder="Contoh: Cuci Kiloan"
                          required
                        />
                        {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                      </div>

                      <div className="col-md-4">
                        <label htmlFor="type" className="form-label">
                          <i className="fas fa-layer-group me-1"></i>
                          Kategori <span className="text-danger">*</span>
                        </label>
                        <select
                          id="type"
                          className={`form-select ${fieldErrors.type ? 'is-invalid' : ''}`}
                          value={form.type}
                          onChange={(e) => {
                            const next = e.target.value as ServiceType;
                            setForm((prev) => ({
                              ...prev,
                              type: next,
                              unit: prev.unit.trim().length === 0 ? defaultUnit(next) : prev.unit,
                            }));
                            if (fieldErrors.type) setFieldErrors((p) => ({ ...p, type: undefined }));
                          }}
                          disabled={formLoading}
                          required
                        >
                          <option value="KILOAN">Kiloan</option>
                          <option value="SATUAN">Satuan</option>
                          <option value="PAKET">Paket</option>
                        </select>
                        {fieldErrors.type && <div className="invalid-feedback">{fieldErrors.type}</div>}
                      </div>

                      <div className="col-md-4">
                        <label htmlFor="price" className="form-label">
                          <i className="fas fa-money-bill-wave me-1"></i>
                          Harga <span className="text-danger">*</span>
                        </label>
                        <input
                          id="price"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          className={`form-control ${fieldErrors.price ? 'is-invalid' : ''}`}
                          value={form.price}
                          onChange={(e) => {
                            setFormField('price', e.target.value);
                            if (fieldErrors.price) setFieldErrors((p) => ({ ...p, price: undefined }));
                          }}
                          disabled={formLoading}
                          placeholder="Contoh: 12000"
                          required
                        />
                        {fieldErrors.price && <div className="invalid-feedback">{fieldErrors.price}</div>}
                        <div className="form-text">Isi angka tanpa pemisah ribuan.</div>
                      </div>

                      <div className="col-md-4">
                        <label htmlFor="unit" className="form-label">
                          <i className="fas fa-ruler-combined me-1"></i>
                          Unit (opsional)
                        </label>
                        <input
                          id="unit"
                          type="text"
                          className={`form-control ${fieldErrors.unit ? 'is-invalid' : ''}`}
                          value={form.unit}
                          onChange={(e) => {
                            setFormField('unit', e.target.value);
                            if (fieldErrors.unit) setFieldErrors((p) => ({ ...p, unit: undefined }));
                          }}
                          disabled={formLoading}
                          placeholder={defaultUnit(form.type)}
                        />
                        {fieldErrors.unit && <div className="invalid-feedback">{fieldErrors.unit}</div>}
                        <div className="form-text">Contoh: kg, pcs, paket. Jika kosong, akan disimpan kosong.</div>
                      </div>

                      <div className="col-12">
                        <label htmlFor="description" className="form-label">
                          <i className="fas fa-align-left me-1"></i>
                          Deskripsi (opsional)
                        </label>
                        <textarea
                          id="description"
                          className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                          rows={3}
                          value={form.description}
                          onChange={(e) => {
                            setFormField('description', e.target.value);
                            if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined }));
                          }}
                          disabled={formLoading}
                          placeholder="Catatan singkat untuk layanan ini (opsional)"
                        />
                        {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
                      </div>

                      <div className="col-12">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="isActive"
                            checked={form.isActive}
                            onChange={(e) => setFormField('isActive', e.target.checked)}
                            disabled={formLoading}
                          />
                          <label className="form-check-label" htmlFor="isActive">
                            <i className="fas fa-toggle-on me-1"></i>
                            Aktifkan Layanan
                          </label>
                        </div>
                      </div>
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

