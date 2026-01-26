'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

type TrackResult = {
  trackingCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  customerName: string | null;
  createdAt: string;
  completedAt: string | null;
  outletName?: string;
};

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDateTimeId(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function labelStatus(status: string): string {
  switch (status) {
    case 'QUEUED':
      return 'Antrian';
    case 'WASHING':
      return 'Dicuci';
    case 'DRYING':
      return 'Dikeringkan';
    case 'IRONING':
      return 'Disetrika';
    case 'READY':
      return 'Siap Diambil';
    case 'TAKEN':
      return 'Sudah Diambil';
    default:
      return status;
  }
}

function labelPaymentStatus(status: string): string {
  switch (status) {
    case 'UNPAID':
      return 'Belum dibayar';
    case 'PENDING':
      return 'Menunggu';
    case 'SETTLEMENT':
      return 'Lunas';
    case 'FAILURE':
      return 'Gagal';
    default:
      return status;
  }
}

function paymentBadgeClass(status: string): string {
  switch (status) {
    case 'SETTLEMENT':
      return 'bg-success';
    case 'UNPAID':
      return 'bg-danger';
    case 'PENDING':
      return 'bg-warning text-dark';
    case 'FAILURE':
      return 'bg-dark';
    default:
      return 'bg-secondary';
  }
}

const steps = [
  { key: 'QUEUED', label: 'Antrian', icon: 'fas fa-receipt' },
  { key: 'WASHING', label: 'Dicuci', icon: 'fas fa-soap' },
  { key: 'DRYING', label: 'Dikeringkan', icon: 'fas fa-wind' },
  { key: 'IRONING', label: 'Disetrika', icon: 'fas fa-tshirt' },
  { key: 'READY', label: 'Siap Diambil', icon: 'fas fa-box-open' },
  { key: 'TAKEN', label: 'Sudah Diambil', icon: 'fas fa-check-circle' },
];

export function TrackOrderGlobal() {
  const router = useRouter();

  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug]);

  const currentIndex = useMemo(() => {
    if (!result?.status) return -1;
    return steps.findIndex((s) => s.key === result.status);
  }, [result?.status]);

  function validateSlug(value: string): string | null {
    const s = normalizeSlug(value);
    if (!s) return 'Slug outlet wajib diisi.';
    if (s.length < 2) return 'Slug outlet terlalu pendek.';
    return null;
  }

  async function handleOpenOutlet(e: React.FormEvent) {
    e.preventDefault();
    const slugError = validateSlug(slug);
    if (slugError) {
      setError(slugError);
      setResult(null);
      return;
    }
    setError(null);
    setResult(null);
    router.push(`/outlet/${encodeURIComponent(normalizedSlug)}`);
  }

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const slugError = validateSlug(slug);
    if (slugError) {
      setError(slugError);
      setResult(null);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 6) {
      setError('Tracking code minimal 6 karakter.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/public/outlet/${encodeURIComponent(normalizedSlug)}/track/${encodeURIComponent(normalizedCode)}`,
        { method: 'GET' }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal melacak pesanan.');
      }
      setResult(json.data as TrackResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal melacak pesanan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="card shadow-sm h-100">
          <div className="card-header bg-white">
            <h2 className="h6 mb-0">
              <i className="fas fa-store me-2 text-primary"></i>
              Buka Halaman Outlet
            </h2>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">
              Masukkan <span className="fw-semibold">slug outlet</span> untuk melihat informasi, layanan, dan harga (jika tersedia).
            </p>

            <form onSubmit={handleOpenOutlet} className="vstack gap-2">
              <div>
                <label className="form-label fw-semibold" htmlFor="outletSlugOpen">
                  Slug outlet
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-link"></i>
                  </span>
                  <input
                    id="outletSlugOpen"
                    className="form-control"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="Contoh: ainul-laundry-cipete"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>
                <div className="form-text">
                  URL contoh: <span className="fw-semibold">/outlet/{normalizedSlug || 'nama-outlet'}</span>
                </div>
              </div>

              <div className="d-grid">
                <button className="btn btn-outline-primary" type="submit">
                  <i className="fas fa-external-link-alt me-2"></i>
                  Buka Outlet
                </button>
              </div>
            </form>

            <hr className="my-3" />

            <div className="text-muted small">
              <i className="fas fa-user-shield me-2"></i>
              Untuk owner/staff, silakan masuk melalui{' '}
              <Link href="/login" className="fw-semibold">
                halaman login
              </Link>
              .
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="card shadow-sm">
          <div className="card-header bg-white">
            <h2 className="h6 mb-0">
              <i className="fas fa-search me-2 text-primary"></i>
              Lacak Pesanan
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleTrack} className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="outletSlugTrack">
                  Slug outlet
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-store"></i>
                  </span>
                  <input
                    id="outletSlugTrack"
                    className="form-control"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="Contoh: ainul-laundry-cipete"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="trackingCodeGlobal">
                  Tracking code
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="fas fa-hashtag"></i>
                  </span>
                  <input
                    id="trackingCodeGlobal"
                    className="form-control"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
                    placeholder="Contoh: A1B2C3D4"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>
              </div>

              <div className="col-12 d-grid">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Melacak...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-location-arrow me-2"></i>
                      Lacak
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-muted small mt-2">
              <i className="fas fa-info-circle me-2"></i>
              Informasi ditampilkan sesuai data yang tersedia saat ini.
            </div>

            {error && (
              <div className="alert alert-danger mt-3 mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {result && (
              <div className="mt-3">
                <div className="card border">
                  <div className="card-body">
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                      <div>
                        <div className="text-muted small">Tracking code</div>
                        <div className="fw-bold">{result.trackingCode}</div>
                        {result.outletName && (
                          <div className="text-muted small mt-2">
                            Outlet: <span className="fw-semibold">{result.outletName}</span>
                          </div>
                        )}
                        <div className="text-muted small mt-2">Status</div>
                        <span className="badge bg-info text-dark border">{labelStatus(result.status)}</span>
                        {result.customerName && (
                          <div className="text-muted small mt-2">
                            Pelanggan: <span className="fw-semibold">{result.customerName}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-end">
                        <div className="text-muted small">Total</div>
                        <div className="fw-bold text-primary">{formatCurrency(Number(result.totalAmount) || 0)}</div>
                        <div className="text-muted small mt-2">Pembayaran</div>
                        <span className={`badge ${paymentBadgeClass(result.paymentStatus)}`}>
                          {labelPaymentStatus(result.paymentStatus)}
                        </span>
                      </div>
                    </div>

                    <hr className="my-3" />

                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="text-muted small">Dibuat</div>
                        <div className="fw-semibold">{formatDateTimeId(result.createdAt)}</div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-muted small">Selesai</div>
                        <div className="fw-semibold">{result.completedAt ? formatDateTimeId(result.completedAt) : '—'}</div>
                      </div>
                    </div>

                    <hr className="my-3" />

                    <div className="text-muted small mb-2">
                      <i className="fas fa-stream me-2"></i>
                      Timeline status
                    </div>

                    <ul className="list-group">
                      {steps.map((s, idx) => {
                        const done = currentIndex >= 0 && idx <= currentIndex;
                        const isCurrent = currentIndex === idx;
                        return (
                          <li
                            key={s.key}
                            className={`list-group-item d-flex justify-content-between align-items-center ${
                              done ? 'list-group-item-success' : ''
                            }`}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <i className={`${s.icon} ${done ? 'text-success' : 'text-muted'}`}></i>
                              <span className={isCurrent ? 'fw-bold' : ''}>{s.label}</span>
                            </div>
                            {isCurrent && <span className="badge bg-primary">Saat ini</span>}
                          </li>
                        );
                      })}
                    </ul>

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                      <Link href={`/outlet/${encodeURIComponent(normalizedSlug || '')}`} className="btn btn-outline-secondary btn-sm">
                        <i className="fas fa-store me-2"></i>
                        Lihat Outlet
                      </Link>
                      <div className="text-muted small">
                        Jika belum punya tracking code, buka halaman outlet untuk melihat kontak (jika tersedia).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

