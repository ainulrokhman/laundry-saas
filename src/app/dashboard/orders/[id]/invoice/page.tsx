'use client';

/**
 * Invoice / Struk (OWNER/STAFF)
 *
 * - Preview invoice (A4) + struk thermal (58/80mm)
 * - Support DP (uang muka) + pelunasan
 * - Hitung kembalian untuk DP dan pelunasan (tunai)
 * - Share WhatsApp (wa.me + Web Share API jika tersedia)
 * - Print via browser (window.print)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { Receipt, ReceiptData } from '@/components/dashboard/Receipt';
import 'sweetalert2/dist/sweetalert2.min.css';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { buildEscposReceipt } from '@/lib/printing/escpos';
import { printViaWebSerial } from '@/lib/printing/webserial';
import { printViaWebUsb } from '@/lib/printing/webusb';
import styles from './print.module.css';

type PaymentStatus = 'UNPAID' | 'PENDING' | 'SETTLEMENT' | 'FAILURE';
type OrderStatus = 'QUEUED' | 'WASHING' | 'DRYING' | 'IRONING' | 'READY' | 'TAKEN';

type InvoiceItem = {
  id: string;
  serviceName: string;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type InvoiceData = {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  paymentNote: string | null;
  totalAmount: number;
  dpAmount: number;
  dpPaidAt: string | null;
  dpNote: string | null;
  cashReceived: number; // Added
  remainingAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  outlet: {
    id: string;
    name: string;
    slug: string;
    address: string;
    contactPhone: string | null;
  };
  items: InvoiceItem[];
  staffName: string | null; // Added
};

type ApiResponse = {
  success: boolean;
  data?: InvoiceData;
  error?: string;
  message?: string;
};

function paymentBadge(status: PaymentStatus): string {
  if (status === 'SETTLEMENT') return 'bg-success';
  if (status === 'UNPAID') return 'bg-danger';
  if (status === 'PENDING') return 'bg-warning';
  return 'bg-secondary';
}

function paymentLabel(status: PaymentStatus): string {
  if (status === 'SETTLEMENT') return 'Lunas';
  if (status === 'UNPAID') return 'Belum dibayar';
  if (status === 'PENDING') return 'DP / Menunggu Pelunasan';
  if (status === 'FAILURE') return 'Gagal';
  return status;
}

function toDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

function parseIdrFromDigits(digits: string): number {
  const n = Number(digits || '0');
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function buildWhatsAppText(args: {
  outletName: string;
  outletAddress: string;
  outletPhone: string | null;
  trackingCode: string;
  createdAt: string;
  customerName: string | null;
  items: Array<{ name: string; qty: number; subtotal: number }>;
  totalAmount: number;
  dpAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  payTitle: string;
  payAmount: number;
  cashReceived: number;
  changeDue: number;
  shortfall: number;
  trackUrl: string | null;
}) {
  const lines: string[] = [];
  lines.push(`${args.outletName}`);
  lines.push(args.outletAddress);
  if (args.outletPhone) lines.push(`WA: ${args.outletPhone}`);
  lines.push('------------------------------');
  lines.push(`Kode: ${args.trackingCode}`);
  lines.push(`Tanggal: ${formatDateTime(args.createdAt)}`);
  if (args.customerName) lines.push(`Pelanggan: ${args.customerName}`);
  lines.push('------------------------------');
  lines.push('Rincian:');
  for (const it of args.items) {
    lines.push(`- ${it.name} x${it.qty}: ${formatCurrency(it.subtotal)}`);
  }
  lines.push('------------------------------');
  lines.push(`Total: ${formatCurrency(args.totalAmount)}`);
  if (args.dpAmount > 0) lines.push(`DP: ${formatCurrency(args.dpAmount)}`);
  lines.push(`Sisa: ${formatCurrency(args.remainingAmount)}`);
  lines.push(`Status: ${paymentLabel(args.paymentStatus)}`);
  lines.push('------------------------------');
  lines.push(`${args.payTitle}: ${formatCurrency(args.payAmount)}`);
  if (args.cashReceived > 0) lines.push(`Diterima: ${formatCurrency(args.cashReceived)}`);
  if (args.changeDue > 0) lines.push(`Kembalian: ${formatCurrency(args.changeDue)}`);
  if (args.shortfall > 0) lines.push(`Kurang: ${formatCurrency(args.shortfall)}`);
  if (args.trackUrl) {
    lines.push('------------------------------');
    lines.push(`Lacak: ${args.trackUrl}`);
  }
  return lines.join('\n');
}



function InvoiceBlock(props: { data: InvoiceData }) {
  const { data } = props;
  return (
    <div className={cn('bg-white', styles.invoicePaper)}>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <h3 className="mb-1">{data.outlet.name}</h3>
          <div className="text-muted">{data.outlet.address}</div>
          {data.outlet.contactPhone ? <div className="text-muted">WA: {data.outlet.contactPhone}</div> : null}
        </div>
        <div className="text-end">
          <div className="fw-semibold">INVOICE</div>
          <div className="text-muted small">Kode: {data.trackingCode}</div>
          <div className="text-muted small">Tanggal: {formatDateTime(data.createdAt)}</div>
        </div>
      </div>

      <hr />

      <div className="row g-2">
        <div className="col-md-6">
          <div className="small text-muted">Pelanggan</div>
          <div className="fw-semibold">{data.customerName || '-'}</div>
          <div className="text-muted small">{data.customerPhone || ''}</div>
        </div>
        <div className="col-md-6 text-md-end">
          <div className="small text-muted">Status Pembayaran</div>
          <div>
            <span className={cn('badge', paymentBadge(data.paymentStatus))}>{paymentLabel(data.paymentStatus)}</span>
          </div>
          {data.paidAt ? <div className="text-muted small mt-1">Lunas: {formatDateTime(data.paidAt)}</div> : null}
          {data.dpPaidAt ? <div className="text-muted small">DP: {formatDateTime(data.dpPaidAt)}</div> : null}
        </div>
      </div>

      {data.notes ? (
        <div className="alert alert-secondary py-2 mt-3 mb-0" role="alert">
          <div className="small text-muted mb-1">Catatan</div>
          <div>{data.notes}</div>
        </div>
      ) : null}

      <div className="table-responsive mt-3">
        <table className="table table-sm">
          <thead className="table-light">
            <tr>
              <th>Layanan</th>
              <th className="text-end">Qty</th>
              <th className="text-end">Harga</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.id}>
                <td>
                  <div className="fw-semibold">{it.serviceName}</div>
                  <div className="text-muted small">{it.serviceUnit ? `Unit: ${it.serviceUnit}` : ''}</div>
                </td>
                <td className="text-end">{Number(it.quantity)}</td>
                <td className="text-end">{formatCurrency(it.unitPrice)}</td>
                <td className="text-end">{formatCurrency(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row justify-content-end">
        <div className="col-md-6">
          <div className="border rounded p-2 bg-body-tertiary">
            <div className="d-flex justify-content-between">
              <div>Total</div>
              <div className="fw-bold">{formatCurrency(data.totalAmount)}</div>
            </div>
            <div className="d-flex justify-content-between">
              <div>DP</div>
              <div>{formatCurrency(data.dpAmount || 0)}</div>
            </div>
            <div className="d-flex justify-content-between">
              <div>Sisa</div>
              <div className="fw-semibold">{formatCurrency(data.remainingAmount || 0)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderInvoicePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams(); // Read query params
  const orderId = params?.id;

  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvoiceData | null>(null);

  const initialType = searchParams?.get('type') === 'dp' ? 'dp' : 'settle';
  const initialCash = searchParams?.get('cash') || '0';

  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>('receipt');
  const [receiptContext, setReceiptContext] = useState<'settle' | 'dp'>(initialType);

  const [dpAmountDigits, setDpAmountDigits] = useState<string>('0');
  const [dpNote, setDpNote] = useState<string>('');
  const [dpCashDigits, setDpCashDigits] = useState<string>(initialType === 'dp' ? initialCash : '0');

  const [settleCashDigits, setSettleCashDigits] = useState<string>(initialType === 'settle' ? initialCash : '0');

  // Sync state with data when loaded
  useEffect(() => {
    if (data) {
      // If stored cashReceived is > 0, use it. Otherwise use initialCash from params if matches context.
      const storedCash = data.cashReceived || 0;
      if (storedCash > 0 && data.paymentStatus === 'SETTLEMENT') {
        setSettleCashDigits(String(storedCash));
      }
    }
  }, [data]);

  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [escposBusy, setEscposBusy] = useState<'serial' | 'usb' | null>(null);

  const [isDpOpen, setIsDpOpen] = useState(false);

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
      if (!orderId) {
        setError('ID order tidak ditemukan.');
        setLoading(false);
        return;
      }
      void fetchInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, refreshKey, orderId]);

  useEffect(() => {
    function afterPrint() {
      document.body.removeAttribute('data-print-mode');
    }
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  useEffect(() => {
    if (!data) return;
    setDpAmountDigits(String(Math.max(0, Math.round(Number(data.dpAmount || 0)))));
    setDpNote(data.dpNote || '');
  }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchInvoice() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/dashboard/orders/${encodeURIComponent(String(orderId))}/invoice`, { method: 'GET' });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat invoice');
      }
      setData(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat invoice');
      setData(null);
    } finally {
      setLoading(false);
    }
  }


  // Auto-print logic if requested via query param
  useEffect(() => {
    if (!loading && data && searchParams?.get('autoprint') === 'true') {
      const mode = searchParams.get('printMode') as any || 'receipt-80'; // default to 80mm
      document.body.setAttribute('data-print-mode', mode);
      setTimeout(() => {
        window.print();
      }, 1000); // Wait for images/styles
    }
  }, [loading, data, searchParams]);

  const dpAmount = useMemo(() => parseIdrFromDigits(dpAmountDigits), [dpAmountDigits]);
  const dpCashReceived = useMemo(() => parseIdrFromDigits(dpCashDigits), [dpCashDigits]);
  const dpChangeDue = useMemo(() => Math.max(0, dpCashReceived - dpAmount), [dpCashReceived, dpAmount]);
  const dpShortfall = useMemo(() => Math.max(0, dpAmount - dpCashReceived), [dpCashReceived, dpAmount]);

  const settleAmount = useMemo(() => (data ? Math.max(0, Math.round(data.remainingAmount)) : 0), [data]);
  const settleCashReceived = useMemo(() => parseIdrFromDigits(settleCashDigits), [settleCashDigits]);
  const settleChangeDue = useMemo(() => Math.max(0, settleCashReceived - settleAmount), [settleCashReceived, settleAmount]);
  const settleShortfall = useMemo(() => Math.max(0, settleAmount - settleCashReceived), [settleCashReceived, settleAmount]);

  const trackUrl = useMemo(() => {
    if (!data) return null;
    if (typeof window === 'undefined') return null;
    return `${window.location.origin}/track/${encodeURIComponent(data.trackingCode)}`;
  }, [data]);

  const waTextForDp = useMemo(() => {
    if (!data) return '';
    return buildWhatsAppText({
      outletName: data.outlet.name,
      outletAddress: data.outlet.address,
      outletPhone: data.outlet.contactPhone,
      trackingCode: data.trackingCode,
      createdAt: data.createdAt,
      customerName: data.customerName,
      items: data.items.map((i) => ({ name: i.serviceName, qty: Number(i.quantity), subtotal: i.subtotal })),
      totalAmount: data.totalAmount,
      dpAmount: data.dpAmount,
      remainingAmount: data.remainingAmount,
      paymentStatus: data.paymentStatus,
      payTitle: 'Pembayaran DP',
      payAmount: dpAmount,
      cashReceived: dpCashReceived,
      changeDue: dpChangeDue,
      shortfall: dpShortfall,
      trackUrl,
    });
  }, [data, dpAmount, dpCashReceived, dpChangeDue, dpShortfall, trackUrl]);

  const waTextForSettle = useMemo(() => {
    if (!data) return '';
    return buildWhatsAppText({
      outletName: data.outlet.name,
      outletAddress: data.outlet.address,
      outletPhone: data.outlet.contactPhone,
      trackingCode: data.trackingCode,
      createdAt: data.createdAt,
      customerName: data.customerName,
      items: data.items.map((i) => ({ name: i.serviceName, qty: Number(i.quantity), subtotal: i.subtotal })),
      totalAmount: data.totalAmount,
      dpAmount: data.dpAmount,
      remainingAmount: data.remainingAmount,
      paymentStatus: data.paymentStatus,
      payTitle: 'Pelunasan',
      payAmount: settleAmount,
      cashReceived: settleCashReceived,
      changeDue: settleChangeDue,
      shortfall: settleShortfall,
      trackUrl,
    });
  }, [data, settleAmount, settleCashReceived, settleChangeDue, settleShortfall, trackUrl]);

  async function saveDp() {
    if (!data) return;
    if (dpAmount > data.totalAmount) {
      await Swal.fire({
        icon: 'error',
        title: 'DP tidak valid',
        text: 'Nominal DP tidak boleh melebihi total.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Simpan DP?',
      html: `<div class="text-start">DP: <b>${formatCurrency(dpAmount)}</b><br/>Kembalian: <b>${formatCurrency(
        dpChangeDue
      )}</b><br/>Kurang bayar: <b>${formatCurrency(dpShortfall)}</b></div>`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, simpan',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/dashboard/orders/${encodeURIComponent(String(data.id))}/dp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dpAmount,
          dpNote: dpNote.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal menyimpan DP');
      }
      setData(json.data || null);
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'DP berhasil disimpan.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1200,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal menyimpan DP',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setBusy(false);
    }
  }

  async function setLunas() {
    if (!data) return;
    if (settleAmount <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Tidak ada sisa',
        text: 'Sisa pembayaran sudah 0. Jika status belum lunas, kamu bisa tandai lunas saja.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Tandai Lunas?',
      html: `<div class="text-start">Pelunasan: <b>${formatCurrency(settleAmount)}</b><br/>Kembalian: <b>${formatCurrency(
        settleChangeDue
      )}</b><br/>Kurang bayar: <b>${formatCurrency(settleShortfall)}</b></div>`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, lunas',
      cancelButtonText: 'Batal',
    });
    if (!confirm.isConfirmed) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/dashboard/orders/${encodeURIComponent(String(data.id))}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid: true,
          paymentNote: 'Pelunasan tunai',
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal menandai lunas');
      }
      setRefreshKey((k) => k + 1);
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Order ditandai lunas.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 1200,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal menandai lunas',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      await Swal.fire({
        icon: 'success',
        title: 'Tersalin',
        text: 'Teks berhasil disalin.',
        timer: 900,
        timerProgressBar: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Clipboard tidak tersedia di browser ini.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  async function shareWhatsApp(text: string) {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    // Jika ada Web Share API, coba share dulu (lebih enak di HP)
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      // ignore, fallback ke wa.me
    }
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  function doPrint(mode: 'invoice-a4') {
    document.body.setAttribute('data-print-mode', mode);
    // beri waktu render untuk apply mode sebelum print
    setTimeout(() => window.print(), 100);
  }

  function doPrintReceipt(mode: 'receipt-80' | 'receipt-58', context: 'settle' | 'dp') {
    setReceiptContext(context);

    // Use iframe printing for thermal receipts (matches POS behavior)
    setTimeout(() => {
      handlePrintThermal(mode);
    }, 100);
  }

  const handlePrintThermal = (mode: 'receipt-58' | 'receipt-80') => {
    const content = document.getElementById('printable-receipt-area');
    const iframe = document.getElementById('printFrame') as HTMLIFrameElement;

    if (!content || !iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const size = mode === 'receipt-58' ? '58mm' : '80mm';
    const bodyWidth = mode === 'receipt-58' ? '48mm' : '72mm';

    doc.open();
    doc.write('<html><head><title>Print Receipt</title>');

    // Thermal Printer CSS
    doc.write(`
          <style>
              @page {
                  size: ${size} auto;
                  margin: 0mm;
              }
              body {
                  width: ${bodyWidth};
                  margin: 0 auto;
                  padding: 2px;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 10px;
                  line-height: 1.2;
                  color: black;
                  background: white;
              }
              .text-center { text-align: center; }
              .text-end { text-align: right; }
              .fw-bold { font-weight: bold; }
              .small { font-size: 9px; }
              .d-flex { display: flex; }
              .justify-content-between { justify-content: space-between; }
              .align-items-center { align-items: center; }
              .mb-1 { margin-bottom: 2px; }
              .mb-2 { margin-bottom: 4px; }
              .mb-3 { margin-bottom: 8px; }
              .pb-2 { padding-bottom: 4px; }
              .pt-2 { padding-top: 4px; }
              .border-bottom { border-bottom: 1px dashed #000; }
              .border-top { border-top: 1px dashed #000; }
              .text-muted { color: #000; }
              .d-block { display: block; }
              
              /* Hide scrollbars etc */
              ::-webkit-scrollbar { display: none; }
          </style>
      `);

    doc.write('</head><body>');
    doc.write(content.innerHTML);
    doc.write('</body></html>');
    doc.close();

    // Small delay for styles to apply before print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  const supportsWebSerial = typeof navigator !== 'undefined' && !!(navigator as any).serial;
  const supportsWebUsb = typeof navigator !== 'undefined' && !!(navigator as any).usb;

  function buildEscposBytes(context: 'settle' | 'dp'): Uint8Array {
    if (!data) return new Uint8Array();
    const payAmount = context === 'dp' ? dpAmount : data.paymentStatus === 'SETTLEMENT' ? data.totalAmount : settleAmount;
    const cashReceived = context === 'dp' ? dpCashReceived : settleCashReceived;
    const changeDue = context === 'dp' ? dpChangeDue : settleChangeDue;
    const shortfall = context === 'dp' ? dpShortfall : settleShortfall;
    const payTitle = context === 'dp' ? 'DP' : data.paymentStatus === 'SETTLEMENT' ? 'BAYAR' : 'LUNAS';

    const lines = [
      { left: data.outlet.name },
      { left: data.outlet.address },
      ...(data.outlet.contactPhone ? [{ left: `WA: ${data.outlet.contactPhone}` }] : []),
      { left: '--------------------------------' },
      { left: `Kode: ${data.trackingCode}` },
      { left: `Tgl: ${formatDateTime(data.createdAt)}` },
      ...(data.customerName ? [{ left: `Plg: ${data.customerName}` }] : []),
      { left: '--------------------------------' },
      ...data.items.map((it) => ({
        left: `${it.serviceName} x${Number(it.quantity)}`,
        right: formatCurrency(it.subtotal),
      })),
      { left: '--------------------------------' },
      { left: 'Total', right: formatCurrency(data.totalAmount) },
      ...(data.dpAmount > 0 ? [{ left: 'DP', right: formatCurrency(data.dpAmount) }] : []),
      { left: 'Sisa', right: formatCurrency(data.remainingAmount) },
      { left: payTitle, right: formatCurrency(payAmount) },
      ...(cashReceived > 0 ? [{ left: 'Diterima', right: formatCurrency(cashReceived) }] : []),
      ...(changeDue > 0 ? [{ left: 'Kembalian', right: formatCurrency(changeDue) }] : []),
      ...(shortfall > 0 ? [{ left: 'Kurang', right: formatCurrency(shortfall) }] : []),
      { left: '--------------------------------' },
    ];

    return buildEscposReceipt({
      lines,
      footerLines: ['Terima kasih'],
      cut: true,
    });
  }

  async function escposPrintSerial(context: 'settle' | 'dp') {
    try {
      setEscposBusy('serial');
      const bytes = buildEscposBytes(context);
      await printViaWebSerial(bytes, { baudRate: 9600 });
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Perintah cetak (WebSerial) sudah dikirim.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal cetak ESC/POS',
        text: e instanceof Error ? e.message : 'Unknown error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setEscposBusy(null);
    }
  }

  async function escposPrintUsb(context: 'settle' | 'dp') {
    try {
      setEscposBusy('usb');
      const bytes = buildEscposBytes(context);
      await printViaWebUsb(bytes);
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Perintah cetak (WebUSB) sudah dikirim.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal cetak ESC/POS',
        text: e instanceof Error ? e.message : 'Unknown error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setEscposBusy(null);
    }
  }

  async function updateStatus(next: OrderStatus) {
    if (!data) return;
    if (data.status === next) return;

    // Optional: Konfirmasi jika status lompat jauh atau krusial?
    // Untuk UX cepat, kita pakai konfirmasi sederhana atau langsung update.
    // Di sini kita pakai konfirmasi untuk keamanan.
    const result = await Swal.fire({
      icon: 'question',
      title: 'Ubah Status?',
      text: `Ubah status menjadi ${next}?`,
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/dashboard/orders/${encodeURIComponent(data.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal update status');
      }
      // Refresh data
      await fetchInvoice();

      await Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal update status',
      });
    } finally {
      setBusy(false);
    }
  }

  const steps: Array<{ key: OrderStatus; label: string; icon: string; color: string }> = [
    { key: 'QUEUED', label: 'Antri', icon: 'fas fa-receipt', color: 'btn-outline-info' },
    { key: 'WASHING', label: 'Cuci', icon: 'fas fa-soap', color: 'btn-outline-warning' },
    { key: 'DRYING', label: 'Kering', icon: 'fas fa-wind', color: 'btn-outline-primary' },
    { key: 'IRONING', label: 'Setrika', icon: 'fas fa-tshirt', color: 'btn-outline-secondary' },
    { key: 'READY', label: 'Siap', icon: 'fas fa-box-open', color: 'btn-outline-success' },
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className={cn('content-header pt-3', styles.noPrint)}>
          <div className="container-fluid">
            <h1 className="m-0">Invoice / Struk</h1>
          </div>
        </div>
        <div className={cn('content', styles.noPrint)}>
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat invoice...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="content-wrapper">
        <div className={cn('content-header pt-3', styles.noPrint)}>
          <div className="container-fluid">
            <div className="alert alert-danger">
              {error || 'Data tidak ditemukan'}
              <div className="mt-2">
                <Link href="/dashboard/orders" className="btn btn-outline-dark btn-sm me-2">Kembali</Link>
                <button onClick={() => setRefreshKey(k => k + 1)} className="btn btn-dark btn-sm">Coba Lagi</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine active payment section
  const showDpForm = data.paymentStatus === 'UNPAID' || data.paymentStatus === 'PENDING';

  return (
    <div className="content-wrapper">
      {/* PRINT AREA: Receipt - WRAPPED for iframe logic */}
      <div className={styles.printArea}>
        <div id="printable-receipt-area" className={styles.printReceipt}>
          <Receipt
            data={{
              outletName: data.outlet.name,
              outletAddress: data.outlet.address,
              outletPhone: data.outlet.contactPhone,
              orderCode: data.trackingCode,
              orderDate: formatDateTime(data.createdAt),
              staffName: data.staffName || undefined,

              customerName: data.customerName,
              items: data.items.map(it => ({
                id: it.id,
                name: it.serviceName,
                quantity: Number(it.quantity),
                price: Number(it.subtotal) / Number(it.quantity), // deriving unit price if not explicit
                subtotal: Number(it.subtotal)
              })),
              // InvoiceData likely has subtotal vs total.
              // ReceiptBlock used: 
              // items mapping... then Total: data.totalAmount. 
              // It didn't explicitly list subtotal/adj in the block I valid.
              // Wait, let's checking ReceiptBlock definition in step 199.
              // Line 175: totalAmount.
              // It lists items, then Total. 
              // It didn't show subtotal/adjustment in ReceiptBlock (lines 164-176).
              // BUT Receipt component supports them. I should try to fill them if available.
              // For now, mapping Total to totalAmount. subtotal can be same or calculated.

              subtotal: data.items.reduce((acc, curr) => acc + Number(curr.subtotal), 0),
              adjustment: 0, // Placeholder if not in data
              totalAmount: data.totalAmount,

              paymentStatusLabel: paymentLabel(data.paymentStatus),

              title: receiptContext === 'dp' ? 'Pembayaran DP' : data.paymentStatus === 'SETTLEMENT' ? 'Pembayaran' : 'Pelunasan',
              billAmount: receiptContext === 'dp' ? dpAmount : data.paymentStatus === 'SETTLEMENT' ? data.totalAmount : settleAmount,
              paymentAmount: receiptContext === 'dp' ? dpCashReceived : settleCashReceived,
              changeAmount: receiptContext === 'dp' ? dpChangeDue : settleChangeDue,
              shortfallAmount: receiptContext === 'dp' ? dpShortfall : settleShortfall
            }}
          />
        </div>
        <div className={styles.printInvoice}>
          <InvoiceBlock data={data} />
        </div>
      </div>

      <div className={cn('content-header pt-3', styles.noPrint)}>
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h1 className="m-0">Invoice / Struk</h1>
              <div className="text-muted small">
                Kode: <span className="fw-semibold select-all">{data.trackingCode}</span>
                <span className="mx-2">•</span>
                <span className={cn("badge", paymentBadge(data.paymentStatus))}>{paymentLabel(data.paymentStatus)}</span>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link href={`/dashboard/orders/${encodeURIComponent(data.id)}`} className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-2"></i>
                Detail
              </Link>
              <Link href="/dashboard/orders" className="btn btn-outline-secondary">
                <i className="fas fa-list me-2"></i>
                List
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('content', styles.noPrint)}>
        <div className="container-fluid">
          <div className="row g-3">
            {/* LEFT COLUMN: PREVIEW */}
            <div className="col-lg-7">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div className="fw-bold">
                    <i className="fas fa-eye me-2"></i>
                    Preview
                  </div>
                  <ul className="nav nav-pills card-header-pills">
                    <li className="nav-item">
                      <button
                        type="button"
                        className={cn('nav-link btn-sm py-1 px-3', activeTab === 'receipt' ? 'active' : '')}
                        onClick={() => setActiveTab('receipt')}
                      >
                        Struk
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={cn('nav-link btn-sm py-1 px-3', activeTab === 'invoice' ? 'active' : '')}
                        onClick={() => setActiveTab('invoice')}
                      >
                        Invoice (A4)
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="card-body bg-light d-flex justify-content-center overflow-auto">
                  {activeTab === 'receipt' ? (
                    <div className="border rounded p-2 bg-white shadow-sm" style={{ minWidth: '300px' }}>
                      <Receipt
                        data={{
                          outletName: data.outlet.name,
                          outletAddress: data.outlet.address,
                          outletPhone: data.outlet.contactPhone,
                          orderCode: data.trackingCode,
                          orderDate: formatDateTime(data.createdAt),
                          staffName: data.staffName || undefined,

                          customerName: data.customerName,
                          items: data.items.map(it => ({
                            id: it.id,
                            name: it.serviceName,
                            quantity: Number(it.quantity),
                            price: Number(it.subtotal) / Number(it.quantity),
                            subtotal: Number(it.subtotal)
                          })),
                          subtotal: data.items.reduce((acc, curr) => acc + Number(curr.subtotal), 0),
                          totalAmount: data.totalAmount,

                          paymentStatusLabel: paymentLabel(data.paymentStatus),

                          title: data.paymentStatus === 'SETTLEMENT' ? 'Pembayaran' : 'Pelunasan',
                          billAmount: data.paymentStatus === 'SETTLEMENT' ? data.totalAmount : settleAmount,
                          paymentAmount: settleCashReceived,
                          changeAmount: settleChangeDue,
                          shortfallAmount: settleShortfall
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border rounded p-3 bg-white shadow-sm w-100">
                      <InvoiceBlock data={data} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIONS */}
            <div className="col-lg-5">

              {/* 1. ORDER STATUS ACTIONS */}
              <div className="card shadow-sm mb-3 border-primary border-top-0 border-end-0 border-bottom-0 border-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title m-0">
                      <i className="fas fa-tasks me-2 text-primary"></i>
                      Status Order
                    </h5>
                    <div className="badge bg-dark">{data.status}</div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {steps.map(s => {
                      const isActive = data.status === s.key;
                      const isPassed = steps.findIndex(x => x.key === data.status) > steps.findIndex(x => x.key === s.key);
                      return (
                        <button
                          key={s.key}
                          className={cn("btn btn-sm flex-fill", isActive ? 'btn-primary' : isPassed ? 'btn-secondary opacity-50' : s.color)}
                          onClick={() => void updateStatus(s.key)}
                          disabled={busy || isActive}
                        >
                          <i className={cn(s.icon, "me-1")}></i>
                          {s.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* SHORTCUT: MARK AS TAKEN */}
                  {data.status === 'READY' && (
                    <div className="d-grid mt-2">
                      <button
                        className="btn btn-success"
                        onClick={() => void updateStatus('TAKEN')}
                        disabled={busy}
                      >
                        <i className="fas fa-check-circle me-2"></i>
                        Sudah Diambil (Selesai)
                      </button>
                    </div>
                  )}
                  {data.status === 'TAKEN' && (
                    <div className="alert alert-success py-2 mb-0 mt-2 text-center small">
                      <i className="fas fa-check-circle me-1"></i> Order sudah selesai/diambil.
                    </div>
                  )}
                </div>
              </div>

              {/* 2. PAYMENT ACTIONS */}
              <div className="card shadow-sm mb-3">
                <div className="card-header bg-white">
                  <h5 className="card-title m-0">
                    <i className="fas fa-cash-register me-2 text-success"></i>
                    Pembayaran & Cetak
                  </h5>
                </div>

                {/* DP FORM (Only if not fully paid) */}
                {showDpForm && (
                  <div className="card-body border-bottom">
                    <div
                      className="d-flex justify-content-between align-items-center mb-2 cursor-pointer"
                      onClick={() => setIsDpOpen(!isDpOpen)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setIsDpOpen(!isDpOpen);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <h6 className="m-0 fw-bold text-muted"> <i className="fas fa-hand-holding-usd me-1"></i> Input DP (Opsional)</h6>
                      <i className={cn("fas small transition-all", isDpOpen ? "fa-chevron-up" : "fa-chevron-down")}></i>
                    </div>

                    {isDpOpen && (
                      <div className="mt-2">
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label small">Nominal DP</label>
                            <input
                              className="form-control form-control-sm"
                              inputMode="numeric"
                              value={dpAmountDigits}
                              onChange={(e) => setDpAmountDigits(toDigitsOnly(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small">Uang Cash</label>
                            <input
                              className="form-control form-control-sm"
                              inputMode="numeric"
                              value={dpCashDigits}
                              onChange={(e) => setDpCashDigits(toDigitsOnly(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="d-flex justify-content-between small text-muted mt-1">
                          <span>Kembali: {formatCurrency(dpChangeDue)}</span>
                          <span className={dpShortfall > 0 ? 'text-danger' : ''}>Kurang: {formatCurrency(dpShortfall)}</span>
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button className="btn btn-sm btn-outline-primary flex-fill" onClick={(e) => { e.stopPropagation(); void saveDp(); }} disabled={busy}>
                            <i className="fas fa-save me-1"></i> Simpan DP
                          </button>
                          {data.dpAmount > 0 && (
                            <div className="d-flex flex-column gap-2 w-100 mt-2">
                              <div className="btn-group w-100">
                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); doPrintReceipt('receipt-80', 'dp'); }} title="Struk 80mm"><i className="fas fa-print"></i></button>
                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); doPrintReceipt('receipt-58', 'dp'); }} title="Struk 58mm"><i className="fas fa-print small"></i></button>
                                <button className="btn btn-sm btn-outline-success" onClick={(e) => { e.stopPropagation(); void shareWhatsApp(waTextForDp); }} title="Bagikan WA"><i className="fab fa-whatsapp"></i></button>
                              </div>
                              {/* ESC/POS for DP */}
                              {(supportsWebSerial || supportsWebUsb) && (
                                <div className="pt-2 border-top">
                                  <div className="d-flex gap-2">
                                    {supportsWebSerial && (
                                      <button className="btn btn-xs btn-outline-dark flex-fill" onClick={(e) => { e.stopPropagation(); escposPrintSerial('dp') }} disabled={!!escposBusy} title="Print Serial">
                                        <i className="fas fa-plug small"></i> Ser
                                      </button>
                                    )}
                                    {supportsWebUsb && (
                                      <button className="btn btn-xs btn-outline-dark flex-fill" onClick={(e) => { e.stopPropagation(); escposPrintUsb('dp') }} disabled={!!escposBusy} title="Print USB">
                                        <i className="fab fa-usb small"></i> USB
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SETTLEMENT / PELUNASAN */}
                <div className="card-body bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="small text-muted">Sisa Tagihan</div>
                      <div className="h4 m-0 fw-bold text-primary">{formatCurrency(settleAmount)}</div>
                    </div>
                    <div className="text-end">
                      <span className={cn('badge', paymentBadge(data.paymentStatus))}>{paymentLabel(data.paymentStatus)}</span>
                    </div>
                  </div>

                  {data.paymentStatus !== 'SETTLEMENT' && (
                    <div className="mb-3 p-2 bg-white border rounded">
                      <label className="form-label small fw-bold">Bayar Lunas (Tunai)</label>
                      <div className="input-group input-group-sm mb-2">
                        <span className="input-group-text">Rp</span>
                        <input
                          className="form-control"
                          placeholder="Uang Diterima"
                          inputMode="numeric"
                          value={settleCashDigits}
                          onChange={(e) => setSettleCashDigits(toDigitsOnly(e.target.value))}
                        />
                      </div>
                      <div className="d-flex justify-content-between small mb-2">
                        <span>Kembali: <b>{formatCurrency(settleChangeDue)}</b></span>
                        <span className={settleShortfall > 0 ? 'text-danger fw-bold' : ''}>Kurang: {formatCurrency(settleShortfall)}</span>
                      </div>
                      <button className="btn btn-success btn-sm w-100" onClick={() => void setLunas()} disabled={busy}>
                        <i className="fas fa-check-double me-2"></i>
                        Bayar Lunas & Simpan
                      </button>
                    </div>
                  )}

                  <hr className="my-2" />

                  <label className="form-label small fw-bold text-muted mb-2">Menu Cetak</label>
                  <div className="row g-2">
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-outline-dark btn-sm flex-fill" onClick={() => doPrintReceipt('receipt-80', 'settle')}>
                        <i className="fas fa-print me-1"></i> Struk 80mm
                      </button>
                      <button className="btn btn-outline-dark btn-sm flex-fill" onClick={() => doPrintReceipt('receipt-58', 'settle')}>
                        <i className="fas fa-print me-1"></i> Struk 58mm
                      </button>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-outline-secondary btn-sm w-100" onClick={() => doPrint('invoice-a4')}>
                        <i className="fas fa-file-invoice me-1"></i> Invoice A4
                      </button>
                    </div>
                  </div>

                  <hr className="my-2" />
                  <label className="form-label small fw-bold text-muted mb-2">Bagikan ke Pelanggan</label>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm flex-fill" onClick={() => void shareWhatsApp(waTextForSettle)}>
                      <i className="fab fa-whatsapp me-1"></i> WA
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => void copyText(waTextForSettle)} title="Salin Teks">
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                  {/* ESC/POS for Settlement */}
                  {(supportsWebSerial || supportsWebUsb) && (
                    <div className="mt-3 pt-2 border-top">
                      <small className="d-block text-muted mb-1">ESC/POS (Raw Print):</small>
                      <div className="d-flex gap-2">
                        {supportsWebSerial && (
                          <button className="btn btn-sm btn-outline-dark flex-fill" onClick={() => escposPrintSerial('settle')} disabled={!!escposBusy}>
                            <i className="fas fa-plug me-1"></i> Serial
                          </button>
                        )}
                        {supportsWebUsb && (
                          <button className="btn btn-sm btn-outline-dark flex-fill" onClick={() => escposPrintUsb('settle')} disabled={!!escposBusy}>
                            <i className="fab fa-usb me-1"></i> USB
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* Hidden iframe for printing */}
      <iframe id="printFrame" style={{ display: 'none' }} title="Receipt"></iframe>
    </div>
  );
}

