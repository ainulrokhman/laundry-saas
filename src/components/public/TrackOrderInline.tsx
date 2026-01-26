'use client';

import { useMemo, useState } from 'react';
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

export function TrackOrderInline(props: { slug: string }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const currentIndex = useMemo(() => {
    if (!result?.status) return -1;
    return steps.findIndex((s) => s.key === result.status);
  }, [result?.status]);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const normalized = code.trim().toUpperCase();
    if (normalized.length < 6) {
      setError('Tracking code minimal 6 karakter.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/public/outlet/${encodeURIComponent(props.slug)}/track/${encodeURIComponent(normalized)}`, {
        method: 'GET',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Gagal melacak order.');
      }
      setResult(json.data as TrackResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal melacak order.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white">
        <h2 className="h6 mb-0">
          <i className="fas fa-search me-2 text-primary"></i>
          Lacak Pesanan
        </h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleTrack} className="row g-2 align-items-end">
          <div className="col-md-8">
            <label className="form-label fw-semibold" htmlFor="trackingCode">
              Tracking code
            </label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-hashtag"></i>
              </span>
              <input
                id="trackingCode"
                className="form-control"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
                placeholder="Contoh: A1B2C3D4"
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <div className="form-text">
              Masukkan kode yang Anda terima untuk melihat status terbaru.
            </div>
          </div>
          <div className="col-md-4 d-grid">
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
                    <span className="badge bg-info text-dark border">
                      {labelStatus(result.status)}
                    </span>
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
                    <div className="fw-semibold">
                      {result.completedAt ? formatDateTimeId(result.completedAt) : '—'}
                    </div>
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
                        {isCurrent && (
                          <span className="badge bg-primary">Saat ini</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="text-muted small mt-2">
                  Informasi ditampilkan sesuai data yang tersedia saat ini.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

