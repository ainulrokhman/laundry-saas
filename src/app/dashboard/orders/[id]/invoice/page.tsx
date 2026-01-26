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
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
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

function ReceiptBlock(props: {
  data: InvoiceData;
  title: string;
  payAmount: number;
  cashReceived: number;
  changeDue: number;
  shortfall: number;
}) {
  const { data } = props;
  return (
    <div className={cn('font-monospace small', styles.receipt)}>
      <div className="text-center fw-bold">{data.outlet.name}</div>
      <div className="text-center">{data.outlet.address}</div>
      {data.outlet.contactPhone ? <div className="text-center">WA: {data.outlet.contactPhone}</div> : null}
      <hr className="my-2" />
      <div>Kode: {data.trackingCode}</div>
      <div>Tanggal: {formatDateTime(data.createdAt)}</div>
      {data.customerName ? <div>Pelanggan: {data.customerName}</div> : null}
      <hr className="my-2" />
      {data.items.map((it) => (
        <div key={it.id} className="d-flex justify-content-between">
          <div className="me-2 text-truncate w-75">
            {it.serviceName} x{Number(it.quantity)}
          </div>
          <div className="text-nowrap">{formatCurrency(it.subtotal)}</div>
        </div>
      ))}
      <hr className="my-2" />
      <div className="d-flex justify-content-between fw-semibold">
        <div>Total</div>
        <div>{formatCurrency(data.totalAmount)}</div>
      </div>
      {data.dpAmount > 0 ? (
        <div className="d-flex justify-content-between">
          <div>DP</div>
          <div>{formatCurrency(data.dpAmount)}</div>
        </div>
      ) : null}
      <div className="d-flex justify-content-between">
        <div>Sisa</div>
        <div>{formatCurrency(data.remainingAmount)}</div>
      </div>
      <div className="d-flex justify-content-between">
        <div>Status</div>
        <div>{paymentLabel(data.paymentStatus)}</div>
      </div>
      <hr className="my-2" />
      <div className="d-flex justify-content-between">
        <div>{props.title}</div>
        <div>{formatCurrency(props.payAmount)}</div>
      </div>
      {props.cashReceived > 0 ? (
        <div className="d-flex justify-content-between">
          <div>Diterima</div>
          <div>{formatCurrency(props.cashReceived)}</div>
        </div>
      ) : null}
      {props.changeDue > 0 ? (
        <div className="d-flex justify-content-between">
          <div>Kembalian</div>
          <div>{formatCurrency(props.changeDue)}</div>
        </div>
      ) : null}
      {props.shortfall > 0 ? (
        <div className="d-flex justify-content-between text-danger">
          <div>Kurang</div>
          <div>{formatCurrency(props.shortfall)}</div>
        </div>
      ) : null}
      <hr className="my-2" />
      <div className="text-center">Terima kasih</div>
    </div>
  );
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
  const orderId = params?.id;

  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvoiceData | null>(null);

  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>('receipt');
  const [printMode, setPrintMode] = useState<'receipt-80' | 'receipt-58' | 'invoice-a4' | null>(null);
  const [receiptContext, setReceiptContext] = useState<'settle' | 'dp'>('settle');

  const [dpAmountDigits, setDpAmountDigits] = useState<string>('0');
  const [dpNote, setDpNote] = useState<string>('');
  const [dpCashDigits, setDpCashDigits] = useState<string>('0');

  const [settleCashDigits, setSettleCashDigits] = useState<string>('0');

  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [escposBusy, setEscposBusy] = useState<'serial' | 'usb' | null>(null);

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
      setPrintMode(null);
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
  }, [data?.trackingCode]);

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

  function doPrint(mode: 'receipt-80' | 'receipt-58' | 'invoice-a4') {
    document.body.setAttribute('data-print-mode', mode);
    setPrintMode(mode);
    // beri waktu render untuk apply mode sebelum print
    setTimeout(() => window.print(), 100);
  }

  function doPrintReceipt(mode: 'receipt-80' | 'receipt-58', context: 'settle' | 'dp') {
    setReceiptContext(context);
    doPrint(mode);
  }

  const supportsWebSerial = typeof navigator !== 'undefined' && !!(navigator as any).serial;
  const supportsWebUsb = typeof navigator !== 'undefined' && !!(navigator as any).usb;

  function buildEscposBytes(context: 'settle' | 'dp'): Uint8Array {
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
            <h1 className="m-0">Invoice / Struk</h1>
          </div>
        </div>
        <div className={cn('content', styles.noPrint)}>
          <div className="container-fluid">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-center">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <div>{error || 'Data tidak ditemukan'}</div>
              </div>
              <div className="mt-3 d-flex gap-2 flex-wrap">
                <Link href="/dashboard/orders" className="btn btn-outline-secondary btn-sm">
                  <i className="fas fa-arrow-left me-1"></i>
                  Kembali
                </Link>
                <button className="btn btn-primary btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
                  <i className="fas fa-redo me-1"></i>
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      {/* PRINT AREA: Receipt */}
      <div className={styles.printArea}>
        <div className={styles.printReceipt}>
          <ReceiptBlock
            data={data}
            title={receiptContext === 'dp' ? 'Pembayaran DP' : data.paymentStatus === 'SETTLEMENT' ? 'Pembayaran' : 'Pelunasan'}
            payAmount={receiptContext === 'dp' ? dpAmount : data.paymentStatus === 'SETTLEMENT' ? data.totalAmount : settleAmount}
            cashReceived={receiptContext === 'dp' ? dpCashReceived : settleCashReceived}
            changeDue={receiptContext === 'dp' ? dpChangeDue : settleChangeDue}
            shortfall={receiptContext === 'dp' ? dpShortfall : settleShortfall}
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
                Kode: <span className="fw-semibold">{data.trackingCode}</span>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link href={`/dashboard/orders/${encodeURIComponent(data.id)}`} className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-2"></i>
                Detail Order
              </Link>
              <Link href="/dashboard/orders" className="btn btn-outline-secondary">
                <i className="fas fa-list me-2"></i>
                Daftar Order
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('content', styles.noPrint)}>
        <div className="container-fluid">
          <div className="row g-3">
            <div className="col-lg-7">
              <div className="card shadow-sm">
                <div className="card-header">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="fas fa-receipt"></i>
                      <span className="fw-semibold">Preview</span>
                      <span className={cn('badge', paymentBadge(data.paymentStatus))}>{paymentLabel(data.paymentStatus)}</span>
                    </div>
                    <ul className="nav nav-pills">
                      <li className="nav-item">
                        <button
                          type="button"
                          className={cn('nav-link', activeTab === 'receipt' ? 'active' : '')}
                          onClick={() => setActiveTab('receipt')}
                        >
                          Struk
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          type="button"
                          className={cn('nav-link', activeTab === 'invoice' ? 'active' : '')}
                          onClick={() => setActiveTab('invoice')}
                        >
                          Invoice (A4)
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  {activeTab === 'receipt' ? (
                    <div className="d-flex justify-content-center">
                      <div className="border rounded p-2 bg-white">
                        <ReceiptBlock
                          data={data}
                          title={data.paymentStatus === 'SETTLEMENT' ? 'Pembayaran' : 'Pelunasan'}
                          payAmount={data.paymentStatus === 'SETTLEMENT' ? data.totalAmount : settleAmount}
                          cashReceived={settleCashReceived}
                          changeDue={settleChangeDue}
                          shortfall={settleShortfall}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded p-3 bg-white">
                      <InvoiceBlock data={data} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card shadow-sm mb-3">
                <div className="card-header">
                  <h3 className="card-title mb-0">
                    <i className="fas fa-print me-2"></i>
                    Cetak & Bagikan
                  </h3>
                </div>
                <div className="card-body">
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary" onClick={() => doPrintReceipt('receipt-80', 'settle')}>
                      <i className="fas fa-print me-2"></i>
                      Cetak Struk 80mm
                    </button>
                    <button className="btn btn-outline-primary" onClick={() => doPrintReceipt('receipt-58', 'settle')}>
                      <i className="fas fa-print me-2"></i>
                      Cetak Struk 58mm
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => doPrint('invoice-a4')}>
                      <i className="fas fa-file-invoice me-2"></i>
                      Cetak Invoice A4
                    </button>
                  </div>
                  <hr />
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-success" onClick={() => void shareWhatsApp(waTextForSettle)}>
                      <i className="fab fa-whatsapp me-2"></i>
                      Bagikan (Pelunasan)
                    </button>
                    <button className="btn btn-outline-success" onClick={() => void shareWhatsApp(waTextForDp)}>
                      <i className="fab fa-whatsapp me-2"></i>
                      Bagikan (DP)
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => void copyText(waTextForSettle)}>
                      <i className="fas fa-copy me-2"></i>
                      Salin (Pelunasan)
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => void copyText(waTextForDp)}>
                      <i className="fas fa-copy me-2"></i>
                      Salin (DP)
                    </button>
                  </div>
                  {trackUrl ? <div className="text-muted small mt-2">Link tracking: {trackUrl}</div> : null}

                  <hr />
                  <div className="small text-muted mb-2">
                    Cetak ESC/POS raw (khusus PC Chrome/Edge). Di HP biasanya tidak didukung.
                  </div>
                  {supportsWebSerial || supportsWebUsb ? (
                    <div className="d-flex gap-2 flex-wrap">
                      {supportsWebSerial ? (
                        <>
                          <button
                            className="btn btn-outline-dark"
                            onClick={() => void escposPrintSerial('settle')}
                            disabled={escposBusy !== null}
                          >
                            <i className="fas fa-plug me-2"></i>
                            ESC/POS Pelunasan (Serial)
                          </button>
                          <button
                            className="btn btn-outline-dark"
                            onClick={() => void escposPrintSerial('dp')}
                            disabled={escposBusy !== null}
                          >
                            <i className="fas fa-plug me-2"></i>
                            ESC/POS DP (Serial)
                          </button>
                        </>
                      ) : null}
                      {supportsWebUsb ? (
                        <>
                          <button
                            className="btn btn-outline-dark"
                            onClick={() => void escposPrintUsb('settle')}
                            disabled={escposBusy !== null}
                          >
                            <i className="fas fa-usb me-2"></i>
                            ESC/POS Pelunasan (USB)
                          </button>
                          <button
                            className="btn btn-outline-dark"
                            onClick={() => void escposPrintUsb('dp')}
                            disabled={escposBusy !== null}
                          >
                            <i className="fas fa-usb me-2"></i>
                            ESC/POS DP (USB)
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <div className="alert alert-light py-2 mb-0" role="alert">
                      Browser ini tidak mendukung WebSerial/WebUSB.
                    </div>
                  )}
                </div>
              </div>

              <div className="card shadow-sm mb-3">
                <div className="card-header">
                  <h3 className="card-title mb-0">
                    <i className="fas fa-hand-holding-usd me-2"></i>
                    DP (Uang Muka)
                  </h3>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label" htmlFor="dpAmount">
                        Nominal DP
                      </label>
                      <input
                        id="dpAmount"
                        className="form-control"
                        inputMode="numeric"
                        value={dpAmountDigits}
                        onChange={(e) => setDpAmountDigits(toDigitsOnly(e.target.value))}
                        placeholder="0"
                      />
                      <div className="form-text">DP saat ini: {formatCurrency(data.dpAmount || 0)}</div>
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="dpNote">
                        Catatan DP (opsional)
                      </label>
                      <textarea
                        id="dpNote"
                        className="form-control"
                        rows={2}
                        value={dpNote}
                        onChange={(e) => setDpNote(e.target.value)}
                        placeholder="Contoh: DP tunai"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="dpCash">
                        Uang diterima (tunai) — untuk hitung kembalian DP
                      </label>
                      <input
                        id="dpCash"
                        className="form-control"
                        inputMode="numeric"
                        value={dpCashDigits}
                        onChange={(e) => setDpCashDigits(toDigitsOnly(e.target.value))}
                        placeholder="0"
                      />
                      <div className="small text-muted mt-1">
                        Kembalian: <span className="fw-semibold">{formatCurrency(dpChangeDue)}</span> · Kurang:{' '}
                        <span className={cn('fw-semibold', dpShortfall > 0 ? 'text-danger' : '')}>
                          {formatCurrency(dpShortfall)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <div className="d-grid mb-2">
                    <button className="btn btn-primary" onClick={() => void saveDp()} disabled={busy}>
                      {busy ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Simpan DP
                        </>
                      )}
                    </button>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-outline-primary" onClick={() => doPrintReceipt('receipt-80', 'dp')}>
                      <i className="fas fa-print me-2"></i>
                      Cetak DP 80mm
                    </button>
                    <button className="btn btn-outline-primary" onClick={() => doPrintReceipt('receipt-58', 'dp')}>
                      <i className="fas fa-print me-2"></i>
                      Cetak DP 58mm
                    </button>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title mb-0">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Pelunasan
                  </h3>
                </div>
                <div className="card-body">
                  <div className="border rounded p-2 bg-body-tertiary mb-3">
                    <div className="d-flex justify-content-between">
                      <div className="text-muted">Sisa pembayaran</div>
                      <div className="fw-bold">{formatCurrency(settleAmount)}</div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <div className="text-muted">Status</div>
                      <div>
                        <span className={cn('badge', paymentBadge(data.paymentStatus))}>{paymentLabel(data.paymentStatus)}</span>
                      </div>
                    </div>
                  </div>

                  <label className="form-label" htmlFor="settleCash">
                    Uang diterima (tunai) — untuk hitung kembalian pelunasan
                  </label>
                  <input
                    id="settleCash"
                    className="form-control"
                    inputMode="numeric"
                    value={settleCashDigits}
                    onChange={(e) => setSettleCashDigits(toDigitsOnly(e.target.value))}
                    placeholder="0"
                  />
                  <div className="small text-muted mt-1">
                    Kembalian: <span className="fw-semibold">{formatCurrency(settleChangeDue)}</span> · Kurang:{' '}
                    <span className={cn('fw-semibold', settleShortfall > 0 ? 'text-danger' : '')}>
                      {formatCurrency(settleShortfall)}
                    </span>
                  </div>
                </div>
                <div className="card-footer d-grid gap-2">
                  <button className="btn btn-success" onClick={() => void setLunas()} disabled={busy}>
                    <i className="fas fa-check-circle me-2"></i>
                    Tandai Lunas
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

