
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
}

interface ReceiptProps {
    data: ReceiptData;
}

export const Receipt: React.FC<ReceiptProps> = ({ data }) => {
    return (
        <div className="font-monospace small receipt-container">
            <style jsx>{`
        .receipt-container {
          width: 100%;
          color: black;
        }
        .text-center { text-align: center; }
        .text-end { text-align: right; }
        .fw-bold { font-weight: bold; }
        .small { font-size: 11px; } /* Slightly bumped base size for readability, will only apply if not overridden */
        .d-flex { display: flex; }
        .justify-content-between { justify-content: space-between; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .border-bottom { border-bottom: 1px dashed #000; }
        .border-top { border-top: 1px dashed #000; }
        .text-muted { color: #000 !important; } /* Force black for thermal printers */
        .d-block { display: block; }
        .pb-2 { padding-bottom: 8px; }
        .pt-2 { padding-top: 8px; }
        .py-1 { padding-top: 4px; padding-bottom: 4px; }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .text-uppercase { text-transform: uppercase; }
        .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .text-danger { color: black !important; font-style: italic; } /* Force black but italic for attention maybe? Or just bold */
      `}</style>

            {/* Header */}
            <div className="text-center mb-2">
                <h5 className="fw-bold mb-0 text-uppercase" style={{ fontSize: '14px' }}>{data.outletName}</h5>
                {data.outletAddress && <div className="d-block">{data.outletAddress}</div>}
                {data.outletPhone && <div className="d-block">WA: {data.outletPhone}</div>}
            </div>

            {/* Order Info */}
            <div className="border-bottom border-top py-2 mb-2">
                <div className="d-flex justify-content-between">
                    <span>Tanggal</span>
                    <span>{data.orderDate}</span>
                </div>
                <div className="d-flex justify-content-between">
                    <span>Order #</span>
                    <span className="fw-bold">{data.orderCode}</span>
                </div>
                <div className="d-flex justify-content-between">
                    <span>Pelanggan</span>
                    <span className="fw-bold text-truncate" style={{ maxWidth: "150px" }}>{data.customerName || "-"}</span>
                </div>
                {data.staffName && (
                    <div className="d-flex justify-content-between">
                        <span>Kasir</span>
                        <span>{data.staffName}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="mb-2 border-bottom pb-2">
                {data.items.map((it, idx) => (
                    <div key={it.id || idx} className="mb-1">
                        <div className="fw-bold">{it.name}</div>
                        <div className="d-flex justify-content-between">
                            <span>{it.quantity} x {formatCurrency(it.price)}</span>
                            <span>{formatCurrency(it.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="mb-2">
                {/* Adjustment */}
                {data.adjustment !== undefined && data.adjustment !== 0 && (
                    <div className="d-flex justify-content-between mb-1">
                        <span>Adj / Diskon</span>
                        <span>{formatCurrency(data.adjustment)}</span>
                    </div>
                )}

                <div className="d-flex justify-content-between fw-bold mb-1" style={{ fontSize: '13px' }}>
                    <span>TOTAL ORDER</span>
                    <span>{formatCurrency(data.totalAmount)}</span>
                </div>

                <div className="d-flex justify-content-between mb-1">
                    <span>DP</span>
                    <span>{(data.dpAmount && data.dpAmount > 0) ? formatCurrency(data.dpAmount) : '-'}</span>
                </div>

                <div className="d-flex justify-content-between mb-1">
                    <span>Pelunasan</span>
                    <span>{data.isSettled ? formatCurrency(data.totalAmount - (data.dpAmount || 0)) : '-'}</span>
                </div>

                {/* Divider */}
                <div className="border-bottom dashed my-1"></div>

                {/* Transaction Details (Bayar/Kembali) - Only if relevant */}
                {data.paymentAmount > 0 && (
                    <div className="d-flex justify-content-between mb-1">
                        <span>Bayar</span>
                        <span>{formatCurrency(data.paymentAmount)}</span>
                    </div>
                )}
                {(data.changeAmount !== undefined && (data.changeAmount > 0 || data.title === 'PEMBAYARAN' || data.title === 'PELUNASAN')) && (
                    <div className="d-flex justify-content-between mb-1">
                        <span>Kembali</span>
                        <span>{formatCurrency(data.changeAmount)}</span>
                    </div>
                )}
                {data.shortfallAmount !== undefined && data.shortfallAmount > 0 && (
                    <div className="d-flex justify-content-between text-danger fw-bold mb-1">
                        <span>Kurang Bayar</span>
                        <span>{formatCurrency(data.shortfallAmount)}</span>
                    </div>
                )}


                {/* Sisa Tagihan */}
                <div className="d-flex justify-content-between fw-bold mt-1">
                    <span>Sisa Tagihan</span>
                    <span>{formatCurrency(data.remainingAmount || 0)}</span>
                </div>

                {/* Status */}
                {data.paymentStatusLabel && (
                    <div className="d-flex justify-content-between mt-1 small text-uppercase">
                        <span>Status</span>
                        <span className="fw-bold">{data.paymentStatusLabel}</span>
                    </div>
                )}
            </div>

            <div className="text-center mt-3">
                <p className="mb-0">Terima kasih atas kepercayaan Anda</p>
            </div>
        </div>
    );
};
