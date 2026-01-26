'use client';

/**
 * Orders List (OWNER/STAFF)
 *
 * Tabel React (tanpa plugin): search/filter/sort/pagination + toggle pembayaran (bookkeeping).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type OrderStatus = 'QUEUED' | 'WASHING' | 'DRYING' | 'IRONING' | 'READY' | 'TAKEN';
type PaymentStatus = 'UNPAID' | 'PENDING' | 'SETTLEMENT' | 'FAILURE';

type OrderRow = {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  customerName: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentNote: string | null;
};

type ApiListResponse = {
  success: boolean;
  data?: {
    items: OrderRow[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
  error?: string;
  message?: string;
};

function labelStatus(status: OrderStatus): string {
  return status;
}

function statusBadge(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    QUEUED: 'bg-info',
    WASHING: 'bg-warning',
    DRYING: 'bg-primary',
    IRONING: 'bg-secondary',
    READY: 'bg-success',
    TAKEN: 'bg-dark',
  };
  return map[status] || 'bg-secondary';
}

function labelPayment(status: PaymentStatus): string {
  if (status === 'SETTLEMENT') return 'Lunas';
  if (status === 'UNPAID') return 'Belum dibayar';
  if (status === 'PENDING') return 'Menunggu';
  if (status === 'FAILURE') return 'Gagal';
  return status;
}

function paymentBadge(status: PaymentStatus): string {
  if (status === 'SETTLEMENT') return 'bg-success';
  if (status === 'UNPAID') return 'bg-danger';
  if (status === 'PENDING') return 'bg-warning';
  return 'bg-secondary';
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [filterPayment, setFilterPayment] = useState<'ALL' | 'UNPAID' | 'SETTLEMENT'>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if (role !== 'OWNER' && role !== 'STAFF') {
        router.push('/dashboard');
        return;
      }
      if (!user?.outletId) {
        setError('Outlet context required. Silakan hubungi admin.');
        setLoading(false);
        return;
      }

      void fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, refreshKey]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    if (filterPayment !== 'ALL') params.set('paymentStatus', filterPayment);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return params.toString();
  }, [query, filterStatus, filterPayment, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [query, filterStatus, filterPayment, limit]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/dashboard/orders?${queryString}`, { method: 'GET' });
      const json = (await res.json().catch(() => null)) as ApiListResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat daftar order');
      }

      setItems(Array.isArray(json.data?.items) ? json.data!.items : []);
      setPagination(json.data?.pagination || { total: 0, page: 1, limit, totalPages: 1 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar order');
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(order: OrderRow) {
    const willPaid = order.paymentStatus !== 'SETTLEMENT';
    const result = await Swal.fire({
      icon: 'warning',
      title: willPaid ? 'Tandai Lunas?' : 'Tandai Belum Dibayar?',
      text: willPaid
        ? 'Order akan ditandai sebagai Lunas (bookkeeping).'
        : 'Order akan ditandai sebagai Belum dibayar.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: willPaid ? 'Ya, Lunas' : 'Ya, Belum dibayar',
      cancelButtonText: 'Batal',
      input: 'text',
      inputLabel: 'Catatan pembayaran (opsional)',
      inputPlaceholder: 'Contoh: dibayar tunai',
      inputValue: order.paymentNote || '',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/dashboard/orders/${order.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid: willPaid, paymentNote: result.value || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memperbarui pembayaran');
      }

      setRefreshKey((k) => k + 1);
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: willPaid ? 'Order ditandai lunas' : 'Order ditandai belum dibayar',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        timer: 1200,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal memperbarui pembayaran',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Daftar Orders</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat daftar order...</p>
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
            <h1 className="m-0">Daftar Orders</h1>
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
              <button className="btn btn-primary btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
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
              <h1 className="m-0">Daftar Orders</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Orders</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row mb-3 g-2 align-items-end">
            <div className="col-12 col-md-auto">
              <Link href="/dashboard/orders/new" className="btn btn-primary btn-sm">
                <i className="fas fa-plus me-1"></i>
                Buat Order Baru
              </Link>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted mb-1" htmlFor="q">
                Pencarian
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  id="q"
                  className="form-control"
                  placeholder="Cari tracking code / nama / telepon..."
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
              <label className="form-label small text-muted mb-1" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="ALL">Semua</option>
                <option value="QUEUED">QUEUED</option>
                <option value="WASHING">WASHING</option>
                <option value="DRYING">DRYING</option>
                <option value="IRONING">IRONING</option>
                <option value="READY">READY</option>
                <option value="TAKEN">TAKEN</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="payment">
                Pembayaran
              </label>
              <select
                id="payment"
                className="form-select form-select-sm"
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value as any)}
              >
                <option value="ALL">Semua</option>
                <option value="UNPAID">Belum dibayar</option>
                <option value="SETTLEMENT">Lunas</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small text-muted mb-1" htmlFor="limit">
                Baris/halaman
              </label>
              <select
                id="limit"
                className="form-select form-select-sm"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-list me-2"></i>
                Orders
              </h3>
              <div className="card-tools">
                <button className="btn btn-tool" type="button" onClick={() => setRefreshKey((k) => k + 1)} title="Refresh">
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              <table className="table table-striped table-hover text-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tracking</th>
                    <th>Pelanggan</th>
                    <th>Status</th>
                    <th>Pembayaran</th>
                    <th>Total</th>
                    <th>Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5">
                        <div className="text-muted">Tidak ada order.</div>
                        <Link href="/dashboard/orders/new" className="btn btn-primary btn-sm mt-2">
                          Buat Order Baru
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    items.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <code>{o.trackingCode}</code>
                        </td>
                        <td>{o.customerName || <span className="text-muted">-</span>}</td>
                        <td>
                          <span className={`badge ${statusBadge(o.status)}`}>{labelStatus(o.status)}</span>
                        </td>
                        <td>
                          <span className={`badge ${paymentBadge(o.paymentStatus)}`}>{labelPayment(o.paymentStatus)}</span>
                          {o.paidAt ? <div className="text-muted small">{formatDateTime(o.paidAt)}</div> : null}
                        </td>
                        <td>{formatCurrency(o.totalAmount)}</td>
                        <td>{formatDateTime(o.createdAt)}</td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void togglePaid(o)}>
                            <i className="fas fa-money-check-alt me-1"></i>
                            {o.paymentStatus === 'SETTLEMENT' ? 'Batalkan Lunas' : 'Tandai Lunas'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted small">
                Total: <span className="fw-semibold">{pagination.total}</span> • Halaman{' '}
                <span className="fw-semibold">{pagination.page}</span> dari{' '}
                <span className="fw-semibold">{pagination.totalPages}</span>
              </div>
              <div className="btn-group btn-group-sm" role="group" aria-label="Pagination">
                <button className="btn btn-outline-secondary" disabled={pagination.page <= 1} onClick={() => setPage(1)}>
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fas fa-angle-left"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

