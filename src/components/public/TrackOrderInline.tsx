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
    dateStyle: 'medium',
    timeStyle: 'short',
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
      return 'Belum Bayar';
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
      return 'bg-success-subtle text-success border border-success';
    case 'UNPAID':
      return 'bg-danger-subtle text-danger border border-danger';
    case 'PENDING':
      return 'bg-warning-subtle text-warning-emphasis border border-warning';
    default:
      return 'bg-secondary-subtle text-secondary border';
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
      setError('Kode minimal 6 karakter');
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
    <div>
      <form onSubmit={handleTrack} className="mb-4">
        <label className="form-label fw-bold small text-uppercase text-muted tracking-wide" htmlFor="trackingCode">
          Kode Transaksi
        </label>
        <div className="input-group">
          <input
            id="trackingCode"
            className="form-control border-end-0 bg-transparent text-dark"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
            placeholder="A1B2C3"
            autoComplete="off"
            style={{
              letterSpacing: '2px',
              fontWeight: 'bold',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: '2px solid #e2e8f0',
              borderRadius: 0,
              paddingLeft: 0
            }}
          />
          <button className="btn btn-luxury-gold px-4 rounded-end-0 rounded-start-0" type="submit" disabled={loading} style={{ borderRadius: '0 4px 0 0' }}>
            {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="fas fa-arrow-right"></i>}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-danger small animate-in">
            <i className="fas fa-exclamation-circle me-1"></i> {error}
          </div>
        )}
      </form>

      {result && (
        <div className="animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white bg-opacity-50 rounded-3 p-3 border border-light mb-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small text-uppercase tracking-wider">ID Pesanan</span>
              <span className="fw-bold fs-5 text-luxury-dark">{result.trackingCode}</span>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted small text-uppercase tracking-wider">Status Bayar</span>
              <span className={`badge rounded-0 fw-normal ${paymentBadgeClass(result.paymentStatus)}`}>
                {labelPaymentStatus(result.paymentStatus)}
              </span>
            </div>

            <div className="d-flex justify-content-between align-items-center border-top border-secondary border-opacity-10 pt-2">
              <span className="text-muted small text-uppercase tracking-wider">Total</span>
              <span className="fw-bold text-luxury-gold fs-5">{formatCurrency(Number(result.totalAmount) || 0)}</span>
            </div>
          </div>

          <h6 className="fw-bold mb-5 small text-uppercase text-muted tracking-widest text-center border-bottom pb-2">Status Pesanan</h6>

          <div className="position-relative px-2">
            {/* Connecting Line */}
            <div
              className="position-absolute top-0 bottom-0 border-start border-2 border-luxury-gold border-opacity-25"
              style={{ left: '1.25rem', zIndex: 0 }}
            ></div>

            <div className="vstack gap-4 position-relative" style={{ zIndex: 1 }}>
              {steps.map((s, idx) => {
                const done = currentIndex >= 0 && idx < currentIndex;
                const isCurrent = currentIndex === idx;
                const future = idx > currentIndex;

                return (
                  <div key={s.key} className="d-flex gap-3 align-items-center">
                    {/* Icon Bubble */}
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 transition-all ${done ? 'bg-luxury-gold text-white border border-luxury-gold shadow-sm' :
                          isCurrent ? 'bg-white text-luxury-gold border border-4 border-luxury-gold shadow-luxury scale-110' :
                            'bg-white text-muted border border-secondary border-opacity-25'
                        }`}
                      style={{ width: '2.5rem', height: '2.5rem' }}
                    >
                      {done ? (
                        <i className="fas fa-check small"></i>
                      ) : isCurrent ? (
                        <i className="fas fa-circle fa-xs animate-pulse"></i>
                      ) : (
                        <div className="rounded-circle bg-secondary opacity-25" style={{ width: '8px', height: '8px' }}></div>
                      )}
                    </div>

                    {/* Label */}
                    <div className={`transition-all ${isCurrent ? 'transform translate-x-2' : ''}`}>
                      <div className={`fw-bold ${isCurrent ? 'text-luxury-dark fs-6' : done ? 'text-dark' : 'text-muted'}`}>
                        {s.label}
                      </div>
                      {isCurrent && (
                        <div className="small text-luxury-gold fst-italic animate-in">Sedang diproses</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-4">
            <small className="text-muted fst-italic opacity-50" style={{ fontSize: '0.7rem' }}>
              Last updated: {formatDateTimeId(new Date().toISOString())}
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
