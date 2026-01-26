'use client';

/**
 * POS - Buat Order Baru (OWNER/STAFF)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatCurrency } from '@/lib/utils';

type ServiceType = 'KILOAN' | 'SATUAN' | 'PAKET';

type PosService = {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  unit: string | null;
  description: string | null;
  isActive: boolean;
};

type CartItem = {
  key: string;
  serviceId: string;
  serviceName: string;
  serviceType: ServiceType;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
};

function defaultQuantity(type: ServiceType): number {
  return type === 'KILOAN' ? 1 : 1;
}

function typeLabel(type: ServiceType): string {
  if (type === 'KILOAN') return 'Kiloan';
  if (type === 'SATUAN') return 'Satuan';
  return 'Paket';
}

function allowDecimalQty(type: ServiceType): boolean {
  return type === 'KILOAN';
}

export default function NewOrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<PosService[]>([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [items, setItems] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [paid, setPaid] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      setLoading(false);
      void fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  async function fetchServices() {
    try {
      setServiceLoading(true);
      const res = await fetch('/api/dashboard/pos/services', { method: 'GET' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat layanan');
      }
      const list: PosService[] = Array.isArray(json.data) ? json.data : [];
      setServices(list.filter((s) => s.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat layanan');
    } finally {
      setServiceLoading(false);
    }
  }

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) ?? null;
  }, [services, selectedServiceId]);

  const totals = useMemo(() => {
    const rows = items.map((it) => ({
      ...it,
      subtotal: Math.round(it.quantity * it.unitPrice),
    }));
    const totalAmount = rows.reduce((sum, r) => sum + r.subtotal, 0);
    return { rows, totalAmount };
  }, [items]);

  function addSelectedService() {
    if (!selectedService) return;
    const key = `${selectedService.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [
      ...prev,
      {
        key,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceType: selectedService.type,
        serviceUnit: selectedService.unit ?? null,
        quantity: defaultQuantity(selectedService.type),
        unitPrice: Math.round(selectedService.price),
      },
    ]);
    setSelectedServiceId('');
  }

  function updateItem(key: string, patch: Partial<CartItem>) {
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }

  async function handleSubmit() {
    if (submitting) return;
    if (items.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Belum ada layanan',
        text: 'Tambahkan minimal satu layanan ke order.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          serviceId: it.serviceId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        paid,
        paymentNote: paymentNote.trim() || undefined,
      };

      const res = await fetch('/api/dashboard/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal membuat order');
      }

      const trackingCode = String(json?.data?.trackingCode || '');
      await Swal.fire({
        icon: 'success',
        title: 'Order berhasil dibuat',
        html:
          trackingCode
            ? `Tracking code: <code>${trackingCode}</code><br/>Simpan kode ini untuk pelanggan.`
            : 'Order berhasil dibuat.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });

      router.push('/dashboard/orders');
      router.refresh();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal membuat order',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Buat Order Baru</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat halaman POS...</p>
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
            <h1 className="m-0">Buat Order Baru</h1>
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
              <h1 className="m-0">Buat Order Baru</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/orders">Orders</Link>
                </li>
                <li className="breadcrumb-item active">Buat Baru</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row g-3">
            <div className="col-lg-8">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-concierge-bell me-2"></i>
                    Pilih Layanan
                  </h3>
                  <div className="card-tools">
                    <button className="btn btn-tool" type="button" onClick={() => void fetchServices()} title="Refresh layanan" disabled={serviceLoading}>
                      <i className={`fas ${serviceLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-8">
                      <label className="form-label">Layanan</label>
                      <select
                        className="form-select"
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        disabled={serviceLoading || services.length === 0}
                      >
                        <option value="">{serviceLoading ? 'Memuat...' : 'Pilih layanan...'}</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {typeLabel(s.type)} — {formatCurrency(s.price)}
                          </option>
                        ))}
                      </select>
                      <div className="form-text">Hanya layanan aktif yang ditampilkan.</div>
                    </div>
                    <div className="col-12 col-md-4">
                      <button type="button" className="btn btn-primary w-100" onClick={addSelectedService} disabled={!selectedService}>
                        <i className="fas fa-plus me-2"></i>
                        Tambah ke Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-list me-2"></i>
                    Item Order
                  </h3>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-striped table-hover text-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Layanan</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Subtotal</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totals.rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted">
                            Belum ada item. Tambahkan layanan di atas.
                          </td>
                        </tr>
                      ) : (
                        totals.rows.map((it) => (
                          <tr key={it.key}>
                            <td className="fw-semibold">
                              {it.serviceName}
                              <div className="text-muted small">
                                {typeLabel(it.serviceType)} {it.serviceUnit ? `• ${it.serviceUnit}` : ''}
                              </div>
                            </td>
                            <td style={{ width: 140 }}>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={it.quantity}
                                min={allowDecimalQty(it.serviceType) ? 0.1 : 1}
                                step={allowDecimalQty(it.serviceType) ? 0.1 : 1}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  updateItem(it.key, { quantity: Number.isFinite(v) ? v : it.quantity });
                                }}
                              />
                            </td>
                            <td style={{ width: 180 }}>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={it.unitPrice}
                                min={0}
                                step={1}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  updateItem(it.key, { unitPrice: Number.isFinite(v) ? v : it.unitPrice });
                                }}
                              />
                            </td>
                            <td>{formatCurrency(it.subtotal)}</td>
                            <td style={{ width: 80 }}>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(it.key)} title="Hapus">
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="text-muted small">Total item: {items.length}</div>
                  <div className="fs-5 fw-bold">{formatCurrency(totals.totalAmount)}</div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-user me-2"></i>
                    Info Pelanggan (opsional)
                  </h3>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="customerName">
                      Nama Pelanggan
                    </label>
                    <input
                      id="customerName"
                      className="form-control"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama pelanggan"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="customerPhone">
                      Nomor WhatsApp
                    </label>
                    <input
                      id="customerPhone"
                      className="form-control"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="6281234567890"
                      inputMode="numeric"
                    />
                    <div className="form-text">Format: 628xxxx (tanpa +, tanpa spasi).</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="notes">
                      Catatan Order (opsional)
                    </label>
                    <textarea
                      id="notes"
                      className="form-control"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan singkat..."
                    />
                  </div>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Pembayaran (Bookkeeping)
                  </h3>
                </div>
                <div className="card-body">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="paid"
                      checked={paid}
                      onChange={(e) => setPaid(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="paid">
                      Tandai Lunas
                    </label>
                  </div>
                  <div className="text-muted small mb-3">
                    Tidak ada upload bukti / approval. Ini hanya pencatatan internal.
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="paymentNote">
                      Catatan Pembayaran (opsional)
                    </label>
                    <textarea
                      id="paymentNote"
                      className="form-control"
                      rows={2}
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Contoh: dibayar tunai"
                    />
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <Link href="/dashboard/orders" className="btn btn-outline-secondary">
                    <i className="fas fa-arrow-left me-2"></i>
                    Kembali
                  </Link>
                  <button className="btn btn-primary" onClick={() => void handleSubmit()} disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Simpan Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

