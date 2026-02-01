
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
    changeAmount: number;   // Kembalian
    shortfallAmount?: number; // Kurang bayar (optional)
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
      `}</style>

            {/* Header */}
            <div className="text-center mb-2">
                <h5 className="fw-bold mb-0 text-uppercase" style={{ fontSize: '14px' }}>{data.outletName}</h5>
                {data.outletAddress && <div className="d-block">{data.outletAddress}</div>}
                {data.outletPhone && <div className="d-block">WA: {data.outletPhone}</div>}

                <div className="mt-2">
                    <small className="d-block">{data.orderDate}</small>
                    {data.staffName && <small className="d-block">Petugas: {data.staffName}</small>}
                </div>
            </div>

            <div className="border-bottom mb-2 pb-2">
                <div className="d-flex justify-content-between">
                    <span>Order #</span>
                    <span className="fw-bold">{data.orderCode}</span>
                </div>
                <div className="d-flex justify-content-between">
                    <span>Cust</span>
                    <span className="fw-bold text-truncate" style={{ maxWidth: "150px" }}>{data.customerName || "-"}</span>
                </div>
            </div>

            {/* Items */}
            <div className="mb-2">
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
            <div className="border-top pt-2 mb-2">
                <div className="d-flex justify-content-between mb-1">
                    <span>Subtotal</span>
                    <span>{formatCurrency(data.subtotal)}</span>
                </div>

                {data.adjustment !== undefined && data.adjustment !== 0 && (
                    <div className="d-flex justify-content-between mb-1">
                        <span>Adj</span>
                        <span>{formatCurrency(data.adjustment)}</span>
                    </div>
                )}

                <div className="d-flex justify-content-between fw-bold mb-2 border-top border-bottom py-1" style={{ fontSize: '13px' }}>
                    <span>TOTAL</span>
                    <span>{formatCurrency(data.totalAmount)}</span>
                </div>

                {/* Payment Details */}
                <div className="d-flex justify-content-between mb-1">
                    <span>{data.title}</span>
                    <span>{formatCurrency(data.billAmount)}</span>
                </div>

                {data.paymentAmount > 0 && (
                    <div className="d-flex justify-content-between mb-1">
                        <span>Diterima</span>
                        <span>{formatCurrency(data.paymentAmount)}</span>
                    </div>
                )}

                <div className="d-flex justify-content-between">
                    <span>Kembali</span>
                    <span>{formatCurrency(data.changeAmount)}</span>
                </div>

                {data.shortfallAmount !== undefined && data.shortfallAmount > 0 && (
                    <div className="d-flex justify-content-between text-danger fw-bold">
                        <span>Kurang</span>
                        <span>{formatCurrency(data.shortfallAmount)}</span>
                    </div>
                )}
            </div>

            {/* Status Label if needed */}
            {data.paymentStatusLabel && (
                <div className="d-flex justify-content-between mb-2 small text-uppercase fw-bold">
                    <span>Status</span>
                    <span>{data.paymentStatusLabel}</span>
                </div>
            )}

            <div className="text-center mt-3">
                <p className="mb-0">Terima kasih atas kepercayaan Anda</p>
            </div>
        </div>
    );
};
