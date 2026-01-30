"use client";

/**
 * Order Detail (OWNER/STAFF)
 *
 * Menampilkan ringkasan order, timeline workflow, tombol update status, dan riwayat status.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type OrderStatus =
  | "QUEUED"
  | "WASHING"
  | "DRYING"
  | "IRONING"
  | "READY"
  | "TAKEN";
type PaymentStatus = "UNPAID" | "PENDING" | "SETTLEMENT" | "FAILURE";

type OrderItemRow = {
  id: string;
  serviceName: string;
  serviceType: string;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type StatusHistoryRow = {
  id: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  createdAt: string;
  changedByUser: { id: string; name: string; phone: string } | null;
};

type OrderDetail = {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  paidAt: string | null;
  paymentNote: string | null;
  items?: OrderItemRow[];
  statusHistory?: StatusHistoryRow[];
};

type ApiDetailResponse = {
  success: boolean;
  data?: OrderDetail;
  error?: string;
  message?: string;
};

const steps: Array<{ key: OrderStatus; label: string; icon: string }> = [
  { key: "QUEUED", label: "Antrian", icon: "fas fa-receipt" },
  { key: "WASHING", label: "Dicuci", icon: "fas fa-soap" },
  { key: "DRYING", label: "Dikeringkan", icon: "fas fa-wind" },
  { key: "IRONING", label: "Disetrika", icon: "fas fa-tshirt" },
  { key: "READY", label: "Siap Diambil", icon: "fas fa-box-open" },
  { key: "TAKEN", label: "Sudah Diambil", icon: "fas fa-check-circle" },
];

function statusBadge(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    QUEUED: "bg-info",
    WASHING: "bg-warning",
    DRYING: "bg-primary",
    IRONING: "bg-secondary",
    READY: "bg-success",
    TAKEN: "bg-dark",
  };
  return map[status] || "bg-secondary";
}

function labelStatus(status: OrderStatus): string {
  const found = steps.find((s) => s.key === status);
  return found?.label || status;
}

function labelPayment(status: PaymentStatus): string {
  if (status === "SETTLEMENT") return "Lunas";
  if (status === "UNPAID") return "Belum dibayar";
  if (status === "PENDING") return "Menunggu";
  if (status === "FAILURE") return "Gagal";
  return status;
}

function paymentBadge(status: PaymentStatus): string {
  if (status === "SETTLEMENT") return "bg-success";
  if (status === "UNPAID") return "bg-danger";
  if (status === "PENDING") return "bg-warning";
  return "bg-secondary";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if (role !== "OWNER" && role !== "STAFF") {
        router.push("/dashboard");
        return;
      }
      if (!user?.outletId) {
        setError("Outlet context required. Silakan hubungi admin.");
        setLoading(false);
        return;
      }

      if (!orderId) {
        setError("ID order tidak ditemukan.");
        setLoading(false);
        return;
      }

      void fetchDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, refreshKey, orderId]);

  const currentIndex = useMemo(() => {
    if (!detail?.status) return -1;
    return steps.findIndex((s) => s.key === detail.status);
  }, [detail?.status]);

  async function fetchDetail() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/dashboard/orders/${encodeURIComponent(String(orderId))}`,
        { method: "GET" },
      );
      const json = (await res
        .json()
        .catch(() => null)) as ApiDetailResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message || json?.error || "Gagal memuat detail order",
        );
      }
      setDetail(json.data || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat detail order");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(next: OrderStatus) {
    if (!detail) return;
    if (detail.status === next) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "Ubah Status Order?",
      text: `Ubah status dari ${labelStatus(detail.status)} menjadi ${labelStatus(next)}.`,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, ubah",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `/api/dashboard/orders/${encodeURIComponent(String(detail.id))}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message || json?.error || "Gagal memperbarui status order",
        );
      }

      setRefreshKey((k) => k + 1);
      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Status order berhasil diperbarui.",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
        timer: 1200,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: e instanceof Error ? e.message : "Gagal memperbarui status order",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Detail Order</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="d-flex flex-column align-items-center justify-content-center py-5">
              <div
                className="spinner-border mb-3"
                role="status"
                style={{
                  color: "var(--md-sys-color-primary)",
                  width: "48px",
                  height: "48px",
                }}
              >
                <span className="visually-hidden">Memuat...</span>
              </div>
              <p
                style={{
                  color: "var(--md-sys-color-on-surface-variant)",
                  font: "var(--md-sys-typescale-body-medium)",
                }}
              >
                Memuat detail order...
              </p>
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
            <h1 className="m-0">Detail Order</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-start gap-3">
                <i className="fas fa-exclamation-circle fa-lg mt-1"></i>
                <div className="flex-grow-1">
                  <strong>Terjadi Kesalahan</strong>
                  <p className="mb-2 mt-1">{error}</p>
                  <div className="d-flex gap-2 flex-wrap">
                    <Link
                      href="/dashboard/orders"
                      className="btn btn-sm btn-outline-danger"
                    >
                      <i className="fas fa-arrow-left me-1"></i>
                      Kembali
                    </Link>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setRefreshKey((k) => k + 1)}
                    >
                      <i className="fas fa-redo me-1"></i>
                      Coba Lagi
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

  if (!detail) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Detail Order</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="alert alert-warning" role="alert">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-info-circle"></i>
                <span>Order tidak ditemukan.</span>
              </div>
            </div>
            <Link
              href="/dashboard/orders"
              className="btn btn-outline-secondary btn-sm"
            >
              <i className="fas fa-arrow-left me-1"></i>
              Kembali
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = Array.isArray(detail.items) ? detail.items : [];
  const history = Array.isArray(detail.statusHistory)
    ? detail.statusHistory
    : [];

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Detail Order</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/orders">Orders</Link>
                </li>
                <li className="breadcrumb-item active">Detail</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <div className="text-muted small">Tracking code</div>
              <div className="h5 mb-0">
                <code>{detail.trackingCode}</code>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link
                href="/dashboard/orders"
                className="btn btn-outline-secondary btn-sm"
              >
                <i className="fas fa-arrow-left me-1"></i>
                Kembali
              </Link>
              <Link
                href={`/dashboard/orders/${encodeURIComponent(detail.id)}/invoice`}
                className="btn btn-primary btn-sm"
              >
                <i className="fas fa-receipt me-1"></i>
                Invoice / Struk
              </Link>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setRefreshKey((k) => k + 1)}
                title="Refresh"
              >
                <i className="fas fa-sync-alt me-1"></i>
                Refresh
              </button>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-5">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-info-circle me-2"></i>
                    Ringkasan
                  </h3>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between flex-wrap gap-3">
                    <div>
                      <div className="text-muted small">Status</div>
                      <span className={`badge ${statusBadge(detail.status)}`}>
                        {labelStatus(detail.status)}
                      </span>
                      <div className="text-muted small mt-3">Pembayaran</div>
                      <span
                        className={`badge ${paymentBadge(detail.paymentStatus)}`}
                      >
                        {labelPayment(detail.paymentStatus)}
                      </span>
                      {detail.paidAt ? (
                        <div className="text-muted small mt-1">
                          {formatDateTime(detail.paidAt)}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-end">
                      <div className="text-muted small">Total</div>
                      <div className="h5 mb-0 text-primary">
                        {formatCurrency(Number(detail.totalAmount) || 0)}
                      </div>
                    </div>
                  </div>

                  <hr className="my-3" />

                  <div className="row g-2">
                    <div className="col-6">
                      <div className="text-muted small">Dibuat</div>
                      <div className="fw-semibold">
                        {formatDateTime(detail.createdAt)}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Selesai</div>
                      <div className="fw-semibold">
                        {detail.completedAt
                          ? formatDateTime(detail.completedAt)
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <hr className="my-3" />

                  <div className="text-muted small">Pelanggan</div>
                  <div className="fw-semibold">
                    {detail.customerName || "—"}
                  </div>
                  <div className="text-muted small mt-2">Telepon</div>
                  <div className="fw-semibold">
                    {detail.customerPhone || "—"}
                  </div>

                  {detail.notes ? (
                    <>
                      <hr className="my-3" />
                      <div className="text-muted small">Catatan</div>
                      <div>{detail.notes}</div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="card shadow-sm mt-3">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-stream me-2"></i>
                    Workflow Status
                  </h3>
                </div>
                <div className="card-body">
                  <div className="text-muted small mb-2">
                    Timeline status membantu Anda memantau tahap pengerjaan.
                  </div>

                  <ul className="list-group">
                    {steps.map((s, idx) => {
                      const done = currentIndex >= 0 && idx <= currentIndex;
                      const isCurrent = currentIndex === idx;
                      return (
                        <li
                          key={s.key}
                          className={`list-group-item d-flex justify-content-between align-items-center ${
                            done ? "list-group-item-success" : ""
                          }`}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <i
                              className={`${s.icon} ${done ? "text-success" : "text-muted"}`}
                            ></i>
                            <span className={isCurrent ? "fw-bold" : ""}>
                              {s.label}
                            </span>
                          </div>
                          {isCurrent ? (
                            <span className="badge bg-primary">Saat ini</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <hr className="my-3" />

                  <div className="text-muted small mb-2">
                    <i className="fas fa-edit me-2"></i>
                    Ubah status
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    {steps.map((s) => {
                      const active = detail.status === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => void updateStatus(s.key)}
                          disabled={active}
                          title={
                            active ? "Status saat ini" : `Ubah ke ${s.label}`
                          }
                        >
                          <i className={`${s.icon} me-1`}></i>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-list me-2"></i>
                    Item Layanan
                  </h3>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-striped table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Layanan</th>
                        <th className="text-end">Qty</th>
                        <th className="text-end">Harga</th>
                        <th className="text-end">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-4 text-muted"
                          >
                            Tidak ada item.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => (
                          <tr key={it.id}>
                            <td>
                              <div className="fw-semibold">
                                {it.serviceName}
                              </div>
                              <div className="text-muted small">
                                {it.serviceType}
                                {it.serviceUnit ? ` • ${it.serviceUnit}` : ""}
                              </div>
                            </td>
                            <td className="text-end">{it.quantity}</td>
                            <td className="text-end">
                              {formatCurrency(Number(it.unitPrice) || 0)}
                            </td>
                            <td className="text-end">
                              {formatCurrency(Number(it.subtotal) || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={3} className="text-end">
                          Total
                        </th>
                        <th className="text-end">
                          {formatCurrency(Number(detail.totalAmount) || 0)}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="card shadow-sm mt-3">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-history me-2"></i>
                    Riwayat Status
                  </h3>
                </div>
                <div className="card-body p-0">
                  {history.length === 0 ? (
                    <div className="p-3 text-muted">
                      Belum ada riwayat perubahan status.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Waktu</th>
                            <th>Perubahan</th>
                            <th>Oleh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h) => (
                            <tr key={h.id}>
                              <td className="text-nowrap">
                                {formatDateTime(h.createdAt)}
                              </td>
                              <td>
                                <span className="badge bg-secondary me-2">
                                  {labelStatus(h.fromStatus)}
                                </span>
                                <i className="fas fa-arrow-right text-muted me-2"></i>
                                <span className="badge bg-primary">
                                  {labelStatus(h.toStatus)}
                                </span>
                              </td>
                              <td>
                                {h.changedByUser ? (
                                  <div>
                                    <div className="fw-semibold">
                                      {h.changedByUser.name}
                                    </div>
                                    <div className="text-muted small">
                                      {h.changedByUser.phone}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
