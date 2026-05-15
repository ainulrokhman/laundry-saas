
import React from 'react';
import { formatCurrency } from '@/lib/utils';

export interface ReceiptItem {
    id?: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

export interface ReceiptData {
    outletName: string;
    outletAddress?: string;
    outletPhone?: string | null;

    orderCode: string;
    orderDate: string;
    staffName?: string;
    customerName?: string | null;

    items: ReceiptItem[];

    subtotal: number;
    adjustment?: number;
    totalAmount: number;

    // Payment status/labels
    paymentStatusLabel?: string;

    // Specific payment info for this receipt instance (e.g. DP receipt vs Full payment receipt)
    title: string;          // e.g. "Pembayaran", "DP", "Pelunasan"
    billAmount: number;     // The amount supposed to be paid now (could be total or remaining)
    paymentAmount: number;  // The cash/money received
    changeAmount?: number;   // Kembalian (optional, hide if undefined)
    shortfallAmount?: number; // Kurang bayar (optional)
    remainingAmount?: number; // Sisa tagihan (utang)
    historyDpAmount?: number; // DP yang pernah dibayarkan (untuk struk pelunasan)

    // New fields for explicit breakdown
    dpAmount?: number;
    isSettled?: boolean;

    // Quota Info
    quotaUsed?: number;
    quotaType?: string;
    remainingQuota?: number;
    isQuotaPayment?: boolean;
}

interface ReceiptProps {
    data: ReceiptData;
}

export const Receipt: React.FC<ReceiptProps> = ({ data }) => {
    return (
        <div className="font-monospace receipt-container">
            <style jsx>{`
        .receipt-container {
          width: 100%;
          color: black;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.2;
          padding: 5px;
          background: white;
        }
        .text-center { text-align: center; }
        .text-end { text-align: right; }
        .text-start { text-align: left; }
        .fw-bold { font-weight: bold; }
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }
        .align-items-center { align-items: center; }
        .border-bottom-dashed { border-bottom: 1px dashed #000; }
        .border-top-dashed { border-top: 1px dashed #000; }
        .py-1 { padding-top: 2px; padding-bottom: 2px; }
        .py-2 { padding-top: 5px; padding-bottom: 5px; }
        .mb-1 { margin-bottom: 3px; }
        .mb-2 { margin-bottom: 6px; }
        .mt-1 { margin-top: 3px; }
        .mt-2 { margin-top: 6px; }
        .text-uppercase { text-transform: uppercase; }
        .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .small { font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .double-divider { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 8px 0; }
      `}</style>

            {/* Header */}
            <div className="text-center mb-2">
                <div className="fw-bold text-uppercase" style={{ fontSize: '18px', letterSpacing: '1px' }}>{data.outletName}</div>
                {data.outletAddress && <div className="small mb-1">{data.outletAddress}</div>}
                {data.outletPhone && <div className="small">WA: {data.outletPhone}</div>}
            </div>

            <div className="divider"></div>

            {/* Order Info */}
            <div className="mb-2">
                <div className="d-flex justify-content-between py-1">
                    <span>TANGGAL</span>
                    <span>{data.orderDate}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                    <span>ORDER ID</span>
                    <span className="fw-bold">{data.orderCode}</span>
                </div>
                <div className="d-flex justify-content-between py-1">
                    <span>PELANGGAN</span>
                    <span className="fw-bold text-truncate" style={{ maxWidth: "160px" }}>{data.customerName || "UMUM"}</span>
                </div>
                {data.staffName && (
                    <div className="d-flex justify-content-between py-1">
                        <span>KASIR</span>
                        <span>{data.staffName}</span>
                    </div>
                )}
            </div>

            <div className="divider"></div>

            {/* Items */}
            <div className="mb-2">
                {data.items.map((it, idx) => (
                    <div key={it.id || idx} className="mb-2">
                        <div className="text-uppercase fw-bold">{it.name}</div>
                        <div className="d-flex justify-content-between">
                            <span>{it.quantity} x {formatCurrency(it.price).replace('Rp\u00A0', '')}</span>
                            <span className="fw-bold">{formatCurrency(it.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="divider"></div>

            {/* Totals Section */}
            <div className="mb-2">
                <div className="d-flex justify-content-between py-1">
                    <span>SUBTOTAL</span>
                    <span>{formatCurrency(data.subtotal)}</span>
                </div>

                {data.adjustment !== undefined && data.adjustment !== 0 && (
                    <div className="d-flex justify-content-between py-1">
                        <span>PENYESUAIAN</span>
                        <span>{formatCurrency(data.adjustment)}</span>
                    </div>
                )}

                <div className="double-divider">
                    <div className="d-flex justify-content-between fw-bold py-1" style={{ fontSize: '17px' }}>
                        <span>TOTAL</span>
                        <span>{formatCurrency(data.totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Payment Details */}
            <div className="mb-2">
                <div className="small fw-bold mb-1 mt-2 text-muted" style={{ fontSize: '10px' }}>RINCIAN PEMBAYARAN</div>
                {data.dpAmount !== undefined && data.dpAmount > 0 && (
                    <div className="d-flex justify-content-between py-1">
                        <span>DP (UANG MUKA)</span>
                        <span>{formatCurrency(data.dpAmount)}</span>
                    </div>
                )}

                {data.isSettled && (
                    <div className="d-flex justify-content-between py-1">
                        <span>PELUNASAN</span>
                        <span>{formatCurrency(data.totalAmount - (data.dpAmount || 0))}</span>
                    </div>
                )}

                <div className="d-flex justify-content-between fw-bold py-1 mt-1" style={{ borderTop: '1px dashed #000', paddingTop: '4px' }}>
                    <span>TUNAI</span>
                    <span>{formatCurrency(data.paymentAmount)}</span>
                </div>

                {data.changeAmount !== undefined && data.changeAmount > 0 && (
                    <div className="d-flex justify-content-between py-1">
                        <span>KEMBALI</span>
                        <span>{formatCurrency(data.changeAmount)}</span>
                    </div>
                )}

                {data.isQuotaPayment && (
                    <div className="mt-2 py-1 border-top-dashed">
                        <div className="d-flex justify-content-between">
                            <span>PAKAI KUOTA ({data.quotaType})</span>
                            <span className="fw-bold">{data.quotaUsed} {data.quotaType}</span>
                        </div>
                        {data.remainingQuota !== undefined && (
                            <div className="d-flex justify-content-between small">
                                <span>SISA KUOTA</span>
                                <span>{data.remainingQuota} {data.quotaType}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="divider"></div>
                <div className="d-flex justify-content-between fw-bold">
                    <span>TOTAL TERBAYAR</span>
                    <span>{formatCurrency(data.isSettled ? data.totalAmount : (data.dpAmount || 0))}</span>
                </div>

                {(data.remainingAmount !== undefined && data.remainingAmount > 0) && (
                    <div className="d-flex justify-content-between fw-bold py-1 mt-1" style={{ borderTop: '1px double #000', paddingTop: '4px', color: '#000' }}>
                        <span>SISA TAGIHAN</span>
                        <span>{formatCurrency(data.remainingAmount)}</span>
                    </div>
                )}
            </div>

            {/* Status & Footer */}
            <div className="divider"></div>
            <div className="text-center py-2">
                {data.paymentStatusLabel && (
                    <div className="fw-bold text-uppercase mb-2" style={{ letterSpacing: '3px', fontSize: '16px', border: '1px solid #000', padding: '4px' }}>
                        *** {data.paymentStatusLabel} ***
                    </div>
                )}

                <div className="mb-1 fw-bold mt-2">Terima kasih atas kunjungan Anda</div>
                <div className="small" style={{ lineHeight: '1.4', marginTop: '6px' }}>
                    Simpan struk ini sebagai bukti pengambilan.<br />
                    Barang yang tidak diambil dalam 30 hari<br />di luar tanggung jawab kami.
                </div>
            </div>
        </div>
    );
};
