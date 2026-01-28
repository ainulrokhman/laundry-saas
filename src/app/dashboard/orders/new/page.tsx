'use client';

/**
 * POS Fullscreen - Buat Order Baru (OWNER/STAFF)
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatCurrency } from '@/lib/utils';
import styles from './pos-fullscreen.module.css';

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
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState('Umum');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentNote, setPaymentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment State
  const [paymentType, setPaymentType] = useState<'lunas' | 'dp'>('lunas');
  const [dpAmountDigits, setDpAmountDigits] = useState<string>('0');
  const [cashReceivedDigits, setCashReceivedDigits] = useState<string>('0');

  // Adjustment State
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

  // Fullscreen Detection
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

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

  // Filter services by search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        typeLabel(s.type).toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  // Paginated services
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredServices.slice(start, end);
  }, [filteredServices, currentPage]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const totals = useMemo(() => {
    const rows = items.map((it) => ({
      ...it,
      subtotal: Math.round(it.quantity * it.unitPrice),
    }));
    const subtotalAmount = rows.reduce((sum, r) => sum + r.subtotal, 0);
    const totalAmount = subtotalAmount + adjustmentAmount;
    return { rows, subtotalAmount, totalAmount };
  }, [items, adjustmentAmount]);

  function addService(service: PosService) {
    setItems((prev) => {
      // Check if service already exists in cart
      const existingItemIndex = prev.findIndex((item) => item.serviceId === service.id);

      if (existingItemIndex !== -1) {
        // If exists, increment quantity
        const newItems = [...prev];
        const incrementAmount = allowDecimalQty(service.type) ? 0.1 : 1;
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: Math.round((newItems[existingItemIndex].quantity + incrementAmount) * 10) / 10,
        };
        return newItems;
      } else {
        // If not exists, add new item
        const key = `${service.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return [
          ...prev,
          {
            key,
            serviceId: service.id,
            serviceName: service.name,
            serviceType: service.type,
            serviceUnit: service.unit ?? null,
            quantity: defaultQuantity(service.type),
            unitPrice: Math.round(service.price),
          },
        ];
      }
    });
  }

  function updateItemQuantity(key: string, delta: number) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.key !== key) return x;
        const newQty = Math.round((x.quantity + delta) * 10) / 10;
        const minQty = allowDecimalQty(x.serviceType) ? 0.1 : 1;
        if (newQty < minQty) return x;
        return { ...x, quantity: newQty };
      })
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((x) => x.key !== key));
  }

  function setItemQuantity(key: string, value: number) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.key !== key) return x;
        const minQty = allowDecimalQty(x.serviceType) ? 0.1 : 1;
        const newQty = Math.max(minQty, Math.round(value * 10) / 10);
        return { ...x, quantity: newQty };
      })
    );
  }

  function toDigitsOnly(val: string) {
    return val.replace(/\D/g, '');
  }

  function parseIdrFromDigits(digits: string) {
    return parseInt(digits || '0', 10);
  }

  // Payment Calculations
  const dpAmount = paymentType === 'dp' ? parseIdrFromDigits(dpAmountDigits) : 0;
  const cashReceived = parseIdrFromDigits(cashReceivedDigits);

  const totalAmount = totals.totalAmount; // Use totals.totalAmount which includes adjustment
  const amountToPay = paymentType === 'lunas' ? totalAmount : dpAmount;
  const remainingAmount = Math.max(0, totalAmount - amountToPay);
  const changeDue = Math.max(0, cashReceived - amountToPay);
  const shortfall = Math.max(0, amountToPay - cashReceived);

  function handleOpenPayment() {
    if (items.length === 0) {
      alert('Pilih minimal satu layanan');
      return;
    }
    setShowPaymentModal(true);
  }

  async function handleSubmit() {
    if (submitting) return;

    // Validation for DP
    if (paymentType === 'dp' && dpAmount > totalAmount) {
      alert('Nominal DP tidak boleh melebihi total tagihan');
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
        // Payment Data
        payment: {
          withPayment: true,
          type: paymentType.toUpperCase(),
          amount: amountToPay,
          totalAmount: totalAmount,
          cashReceived: cashReceived,
          change: changeDue,
          note: paymentNote,
        },
        paid: paymentType === 'lunas' && shortfall === 0,
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
        html: trackingCode
          ? `Kode tracking: <code>${trackingCode}</code><br/>Simpan kode ini untuk pelanggan.`
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
      <div className={styles.posContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Memuat POS...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.posContainer}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>
            <i className="fas fa-cash-register"></i>
            KASIR
          </h1>
          <button className={styles.exitButton} onClick={() => router.push('/dashboard/orders')}>
            <i className="fas fa-times me-1"></i>
            Keluar
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="alert alert-danger">
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
    );
  }

  return (
    <>
      {/* Landscape hint for mobile portrait */}
      <div className={styles.landscapeHint}>
        <i className="fas fa-mobile-alt"></i>
        <h3>Putar Layar ke Landscape</h3>
        <p>Untuk pengalaman terbaik, gunakan mode landscape (horizontal)</p>
      </div>

      <div className={styles.posContainer}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center px-3 py-2 text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h1 className="h5 mb-0 fw-semibold d-flex align-items-center gap-2">
            <i className="fas fa-cash-register"></i>
            KASIR
          </h1>
          <button
            className="btn btn-sm border border-white border-opacity-25 text-white"
            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
              } else {
                router.push('/dashboard/orders');
              }
            }}
          >
            <i className="fas fa-times me-1"></i>
            Keluar
          </button>
        </div>

        {/* Main Content - 2 Columns */}
        <div className={styles.mainContent}>
          {/* Left Panel - Services List */}
          <div className="bg-white d-flex flex-column overflow-hidden border-end">
            {/* Search Bar */}
            <div className="p-3 border-bottom bg-light">
              <input
                type="text"
                className="form-control"
                placeholder="Cari layanan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Services Grid */}
            <div className={styles.servicesGrid}>
              {serviceLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Memuat layanan...</p>
                </div>
              ) : paginatedServices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p>{searchQuery ? 'Tidak ada layanan ditemukan' : 'Belum ada layanan'}</p>
                </div>
              ) : (
                paginatedServices.map((service) => (
                  <div
                    key={service.id}
                    className={styles.serviceCard}
                    onClick={() => addService(service)}
                  >
                    <div className={styles.serviceCardName}>
                      {service.name}
                    </div>
                    <div className={styles.serviceCardPrice}>
                      {formatCurrency(service.price)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredServices.length > itemsPerPage && (
              <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i> Previous
                </button>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Order Summary */}
          <div className="d-flex flex-column h-100" style={{ background: '#fafafa' }}>
            {/* Customer Section */}
            <div className="bg-white p-3 border-bottom flex-shrink-0 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-user text-secondary"></i>
                <span className="fw-semibold text-dark fs-5">{customerName || 'Umum'}</span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-light text-primary rounded-circle" style={{ width: '32px', height: '32px' }}>
                  <i className="fas fa-cog"></i>
                </button>
                <button className="btn btn-sm btn-light text-danger rounded-circle" style={{ width: '32px', height: '32px' }}>
                  <i className="fas fa-eraser"></i>
                </button>
              </div>
            </div>

            {/* Cart Section - Scrollable */}
            <div
              className={`flex-grow-1 overflow-auto bg-white mx-3 mt-3 rounded shadow-sm ${styles.cartSection}`}
              style={{ minHeight: 0 }}
            >
              {items.length === 0 ? (
                <div className="p-4">
                  <div className="alert alert-success border-0 bg-success bg-opacity-10 rounded-3">
                    <div className="d-flex align-items-center gap-2 mb-3 text-success">
                      <i className="fas fa-info-circle fs-5"></i>
                      <h6 className="fw-bold mb-0">Petunjuk</h6>
                    </div>
                    <ul className="ps-3 mb-0 text-success small" style={{ listStyleType: 'disc' }}>
                      <li className="mb-2">Untuk memulai silakan pilih barang disamping atau klik icon <i className="fas fa-search mx-1"></i> (tampilan mobile)</li>
                      <li className="mb-2">Klik icon <i className="fas fa-cog mx-1"></i> untuk mengurutkan harga</li>
                      <li className="mb-2">Klik nama disebelah icon <i className="fas fa-user mx-1"></i> untuk mengganti nama customer</li>
                      <li>Klik icon <i className="fas fa-trash-alt mx-1"></i> untuk menghapus semua barang yang sudah dipilih</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  {totals.rows.map((item) => (
                    <div key={item.key} className={styles.cartItem + " px-3"}>
                      {/* Row 1: Title */}
                      <div className={styles.cartItemTitle}>
                        {item.serviceName}
                      </div>

                      {/* Row 2: Price & Controls */}
                      <div className="d-flex justify-content-between align-items-end mt-2">
                        <div className="d-flex flex-column">
                          <div className={styles.cartItemPrice}>
                            {formatCurrency(item.unitPrice)}
                          </div>
                          {/* Placeholder for Stock if needed, for now omitted as data missing */}
                          {/* <small className="text-muted" style={{fontSize: '0.75rem'}}>Stok: -</small> */}
                        </div>

                        <div className="d-flex align-items-center gap-3">
                          {/* Qty Controls */}
                          <div className="d-flex align-items-center gap-1 bg-light rounded px-1" style={{ border: '1px solid #e2e8f0' }}>
                            <button
                              className="btn btn-sm d-flex align-items-center justify-content-center p-0 text-muted"
                              style={{ width: '24px', height: '24px', background: '#e2e8f0', border: 'none' }}
                              onClick={() => updateItemQuantity(item.key, allowDecimalQty(item.serviceType) ? -0.1 : -1)}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className={`text-center fw-semibold border-0 bg-transparent ${styles.quantityInput}`}
                              style={{ width: '40px', fontSize: '0.9rem', color: '#334155' }}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  setItemQuantity(item.key, val);
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val <= 0) {
                                  setItemQuantity(item.key, allowDecimalQty(item.serviceType) ? 0.1 : 1);
                                }
                              }}
                              step={allowDecimalQty(item.serviceType) ? 0.1 : 1}
                              min={allowDecimalQty(item.serviceType) ? 0.1 : 1}
                            />
                            <button
                              className="btn btn-sm d-flex align-items-center justify-content-center p-0 text-muted"
                              style={{ width: '24px', height: '24px', background: '#e2e8f0', border: 'none' }}
                              onClick={() => updateItemQuantity(item.key, allowDecimalQty(item.serviceType) ? 0.1 : 1)}
                            >
                              +
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="fw-bold text-dark text-end" style={{ fontSize: '0.95rem', minWidth: '80px' }}>
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </div>

                          {/* Trash / Menu */}
                          <button
                            className="btn btn-sm text-secondary p-0 d-flex align-items-center justify-content-center"
                            style={{ width: '20px', height: '24px', border: 'none', background: 'none' }}
                            onClick={() => removeItem(item.key)}
                          >
                            <i className="fas fa-ellipsis-v"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Summary Section - Fixed */}
            <div className="bg-white mx-3 my-3 p-3 rounded shadow-sm flex-shrink-0">
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="text-secondary">Sub Total</span>
                <span className="fw-semibold text-dark">{formatCurrency(totals.subtotalAmount)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="text-secondary">Penyesuaian</span>
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center p-0"
                    style={{ width: '28px', height: '28px', background: '#c9b3e6', color: 'white', border: 'none', fontSize: '0.9rem' }}
                    onClick={() => setAdjustmentAmount((prev) => prev - 100)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px' }}
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(Number(e.target.value) || 0)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center p-0"
                    style={{ width: '28px', height: '28px', background: '#c9b3e6', color: 'white', border: 'none', fontSize: '0.9rem' }}
                    onClick={() => setAdjustmentAmount((prev) => prev + 100)}
                  >
                    +
                  </button>
                </div>
              </div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center py-2">
                <span className="fw-semibold text-dark" style={{ fontSize: '1.1rem' }}>Total</span>
                <span className="fw-bold" style={{ fontSize: '1.5rem', color: '#667eea' }}>{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              className="btn btn-lg mx-3 mb-3 d-flex align-items-center justify-content-center gap-2 fw-semibold shadow"
              style={{ background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)', color: 'white', fontSize: '1.1rem' }}
              onClick={handleOpenPayment}
              disabled={items.length === 0}
            >
              <i className="fas fa-money-bill-wave"></i>
              Bayar {formatCurrency(totals.totalAmount)}
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <>
            <div className="modal-backdrop fade show"></div>
            <div className="modal fade show d-block" tabIndex={-1}>
              <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fas fa-cash-register me-2 text-primary"></i>
                      Pembayaran
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPaymentModal(false)}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body">
                    {/* Customer Info */}
                    <div className="mb-3">
                      <h6 className="fw-bold mb-2">
                        <i className="fas fa-user me-1 text-secondary"></i>
                        Info Pelanggan
                      </h6>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label small" htmlFor="modalCustomerName">
                            Nama
                          </label>
                          <input
                            id="modalCustomerName"
                            className="form-control"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nama pelanggan"
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small" htmlFor="modalCustomerPhone">
                            WhatsApp
                          </label>
                          <input
                            id="modalCustomerPhone"
                            className="form-control"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="628xxx"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small" htmlFor="modalNotes">
                            Catatan
                          </label>
                          <textarea
                            id="modalNotes"
                            className="form-control"
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Catatan order (opsional)"
                          />
                        </div>
                      </div>
                    </div>

                    <hr />

                    {/* Payment Section */}
                    <div>
                      <h6 className="fw-bold mb-2">
                        <i className="fas fa-money-bill-wave me-1 text-secondary"></i>
                        Pembayaran
                      </h6>

                      {/* Total Display */}
                      <div className="alert alert-info mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-semibold">Total Tagihan:</span>
                          <span className="fs-4 fw-bold">{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>

                      {/* Payment Type */}
                      <div className="mb-3">
                        <label className="form-label small">Tipe Pembayaran</label>
                        <div className="btn-group w-100" role="group">
                          <input
                            type="radio"
                            className="btn-check"
                            name="modalPaymentType"
                            id="modalPaymentTypeLunas"
                            value="lunas"
                            checked={paymentType === 'lunas'}
                            onChange={(e) => setPaymentType(e.target.value as 'lunas' | 'dp')}
                          />
                          <label className="btn btn-outline-success" htmlFor="modalPaymentTypeLunas">
                            <i className="fas fa-check-circle me-1"></i>
                            Lunas
                          </label>
                          <input
                            type="radio"
                            className="btn-check"
                            name="modalPaymentType"
                            id="modalPaymentTypeDP"
                            value="dp"
                            checked={paymentType === 'dp'}
                            onChange={(e) => setPaymentType(e.target.value as 'lunas' | 'dp')}
                          />
                          <label className="btn btn-outline-warning" htmlFor="modalPaymentTypeDP">
                            <i className="fas fa-hand-holding-usd me-1"></i>
                            DP (Uang Muka)
                          </label>
                        </div>
                      </div>

                      {/* DP Amount */}
                      {paymentType === 'dp' && (
                        <div className="mb-3">
                          <label className="form-label small" htmlFor="modalDpAmount">
                            Nominal DP
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">Rp</span>
                            <input
                              id="modalDpAmount"
                              className="form-control"
                              inputMode="numeric"
                              value={dpAmountDigits}
                              onChange={(e) => {
                                const digits = toDigitsOnly(e.target.value);
                                const amount = parseIdrFromDigits(digits);
                                if (amount <= totalAmount) {
                                  setDpAmountDigits(digits);
                                }
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-text small">Max: {formatCurrency(totalAmount)}</div>
                        </div>
                      )}

                      {/* Cash Received */}
                      <div className="mb-3">
                        <label className="form-label small" htmlFor="modalCashReceived">
                          Uang Diterima
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">Rp</span>
                          <input
                            id="modalCashReceived"
                            className="form-control"
                            inputMode="numeric"
                            value={cashReceivedDigits}
                            onChange={(e) => setCashReceivedDigits(toDigitsOnly(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="alert alert-light">
                        {paymentType === 'dp' && dpAmount > 0 && (
                          <>
                            <div className="d-flex justify-content-between small mb-1">
                              <span>DP:</span>
                              <span>{formatCurrency(dpAmount)}</span>
                            </div>
                            <div className="d-flex justify-content-between small text-warning mb-2">
                              <span>Sisa:</span>
                              <strong>{formatCurrency(remainingAmount)}</strong>
                            </div>
                          </>
                        )}
                        <div className="d-flex justify-content-between text-success">
                          <span>Kembalian:</span>
                          <strong>{formatCurrency(changeDue)}</strong>
                        </div>
                        {shortfall > 0 && (
                          <div className="d-flex justify-content-between text-danger">
                            <span>Kurang:</span>
                            <strong>{formatCurrency(shortfall)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Payment Note */}
                      <div>
                        <label className="form-label small" htmlFor="modalPaymentNote">
                          Catatan Pembayaran
                        </label>
                        <textarea
                          id="modalPaymentNote"
                          className="form-control"
                          rows={2}
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Catatan pembayaran (opsional)"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                      Batal
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle me-2"></i>
                          Simpan Order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}
