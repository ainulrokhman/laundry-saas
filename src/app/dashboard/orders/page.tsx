"use client";

/**
 * Orders List (OWNER/STAFF)
 *
 * Tabel React (tanpa plugin): search/filter/sort/pagination + toggle pembayaran (bookkeeping).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ResponsiveTableToCards } from "@/components/adminlte/ResponsiveTableToCards";

type OrderStatus =
  | "QUEUED"
  | "WASHING"
  | "DRYING"
  | "IRONING"
  | "READY"
  | "TAKEN";
type PaymentStatus = "UNPAID" | "PENDING" | "SETTLEMENT" | "FAILURE";

type OrderRow = {
  id: string;
  trackingCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  customerName: string | null;
  createdAt: string;
  paidAt: string | null;
  paymentNote: string | null;
  outletId?: string;
  outletName?: string;
  dpAmount?: number;
};

type ApiListResponse = {
  success: boolean;
  data?: {
    items: OrderRow[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  error?: string;
  message?: string;
  isGlobalMode?: boolean;
};

function labelStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    QUEUED: "Antri",
    WASHING: "Cuci",
    DRYING: "Kering",
    IRONING: "Setrika",
    READY: "Siap",
    TAKEN: "Diambil",
  };
  return labels[status] || status;
}

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

function labelPayment(status: PaymentStatus): string {
  if (status === "SETTLEMENT") return "Lunas";
  if (status === "UNPAID") return "Belum dibayar";
  if (status === "PENDING") return "DP";
  if (status === "FAILURE") return "Gagal";
  return status;
}

function paymentBadge(status: PaymentStatus): string {
  if (status === "SETTLEMENT") return "bg-success";
  if (status === "UNPAID") return "bg-danger";
  if (status === "PENDING") return "bg-warning";
  return "bg-secondary";
}

/**
 * Get the next logical status in the workflow
 */
function getNextStatus(current: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = [
    "QUEUED",
    "WASHING",
    "DRYING",
    "IRONING",
    "READY",
    "TAKEN",
  ];
  const currentIndex = flow.indexOf(current);
  if (currentIndex === -1 || currentIndex === flow.length - 1) return null;
  return flow[currentIndex + 1];
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [filterPayment, setFilterPayment] = useState<
    "ALL" | "UNPAID" | "PENDING" | "SETTLEMENT"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [items, setItems] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const [isGlobalMode, setIsGlobalMode] = useState(false);

  // Guard: auth/role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    if (role !== "OWNER" && role !== "STAFF") {
      router.push("/dashboard");
      return;
    }
    // STAFF requires outlet, OWNER can be in global mode
    if (role === "STAFF" && !user?.outletId) {
      setError("Outlet context required. Silakan hubungi admin.");
      setLoading(false);
      return;
    }
  }, [status, router, role, user?.outletId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterPayment !== "ALL") params.set("paymentStatus", filterPayment);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [query, filterStatus, filterPayment, page, limit]);

  // OWNER can access in global mode (no outletId), STAFF requires outlet
  const canFetch =
    status === "authenticated" &&
    (role === "OWNER" || (role === "STAFF" && !!user?.outletId));

  // Fetch when page/filter/query/limit changes, or manual refresh
  useEffect(() => {
    if (!canFetch) return;
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canFetch, queryString, refreshKey]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/dashboard/orders?${queryString}`, {
        method: "GET",
      });
      const json = (await res
        .json()
        .catch(() => null)) as ApiListResponse | null;
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message || json?.error || "Gagal memuat daftar order",
        );
      }

      setItems(Array.isArray(json.data?.items) ? json.data!.items : []);
      const nextPagination = json.data?.pagination || {
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
      };
      setPagination(nextPagination);
      setIsGlobalMode(json.isGlobalMode || false);
      // Sinkronkan state page jika backend mengoreksi (mis. out-of-range)
      if (
        Number.isFinite(nextPagination.page) &&
        nextPagination.page !== page
      ) {
        setPage(nextPagination.page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar order");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(
    orderId: string,
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    if (currentStatus === newStatus) return;

    const result = await Swal.fire({
      icon: "question",
      title: "Ubah Status?",
      text: `Ubah status dari ${labelStatus(currentStatus)} menjadi ${labelStatus(newStatus)}?`,
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, Ubah",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) {
      // Reset dropdown to current status if cancelled
      setRefreshKey((k) => k + 1);
      return;
    }

    try {
      const res = await fetch(
        `/api/dashboard/orders/${encodeURIComponent(orderId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || "Gagal update status");
      }

      setRefreshKey((k) => k + 1);
      await Swal.fire({
        icon: "success",
        title: "Status Diperbarui",
        text: `Status berhasil diubah menjadi ${labelStatus(newStatus)}`,
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Gagal",
        text: e instanceof Error ? e.message : "Gagal update status",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      // Reset to current status on error
      setRefreshKey((k) => k + 1);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Daftar Orders</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="d-flex flex-column align-items-center justify-content-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Memuat...</span>
              </div>
              <p className="text-muted">Memuat daftar order...</p>
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
            <h1 className="m-0">Daftar Orders</h1>
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
                  <button
                    className="btn btn-sm btn-outline-danger"
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
    );
  }

  // Status chips for mobile filter
  const statusChips = [
    { value: "ALL", label: "Semua" },
    { value: "QUEUED", label: "Antri" },
    { value: "WASHING", label: "Cuci" },
    { value: "DRYING", label: "Kering" },
    { value: "IRONING", label: "Setrika" },
    { value: "READY", label: "Siap" },
    { value: "TAKEN", label: "Diambil" },
  ];

  const paymentChips = [
    { value: "ALL", label: "Semua" },
    { value: "UNPAID", label: "Belum Bayar" },
    { value: "PENDING", label: "DP" },
    { value: "SETTLEMENT", label: "Lunas" },
  ];

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Daftar Orders</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Orders</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {/* Mobile: Search Bar + Filter Chips */}
          <div className="d-md-none mb-3">
            {/* Search */}
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Cari tracking / nama / telepon..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {query.trim().length > 0 && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="mb-2">
              <div className="form-label mb-2 text-muted small">Status Order</div>
              <div className="d-flex flex-wrap gap-2">
                {statusChips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`btn btn-sm rounded-pill ${filterStatus === chip.value ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setFilterStatus(chip.value as any);
                      setPage(1);
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Filter Chips */}
            <div>
              <div className="form-label mb-2 text-muted small">Pembayaran</div>
              <div className="d-flex flex-wrap gap-2">
                {paymentChips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`btn btn-sm rounded-pill ${filterPayment === chip.value ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => {
                      setFilterPayment(chip.value as any);
                      setPage(1);
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop: Traditional Filters */}
          <div className="d-none d-md-block">
            <div className="row mb-3 g-2 align-items-end">
              <div className="col-md-auto">
                <Link
                  href="/dashboard/orders/new"
                  className="btn btn-primary btn-sm"
                >
                  <i className="fas fa-plus me-1"></i>
                  Buat Order Baru
                </Link>
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1" htmlFor="q">
                  Pencarian
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input
                    id="q"
                    className="form-control"
                    placeholder="Cari tracking code / nama / telepon..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                  {query.trim().length > 0 && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setPage(1);
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-2">
                <label
                  className="form-label small text-muted mb-1"
                  htmlFor="status"
                >
                  Status
                </label>
                <select
                  id="status"
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua</option>
                  <option value="QUEUED">Antri</option>
                  <option value="WASHING">Cuci</option>
                  <option value="DRYING">Kering</option>
                  <option value="IRONING">Setrika</option>
                  <option value="READY">Siap</option>
                  <option value="TAKEN">Diambil</option>
                </select>
              </div>
              <div className="col-md-2">
                <label
                  className="form-label small text-muted mb-1"
                  htmlFor="payment"
                >
                  Pembayaran
                </label>
                <select
                  id="payment"
                  className="form-select form-select-sm"
                  value={filterPayment}
                  onChange={(e) => {
                    setFilterPayment(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Semua</option>
                  <option value="UNPAID">Belum dibayar</option>
                  <option value="PENDING">DP</option>
                  <option value="SETTLEMENT">Lunas</option>
                </select>
              </div>
              <div className="col-md-2">
                <label
                  className="form-label small text-muted mb-1"
                  htmlFor="limit"
                >
                  Baris/halaman
                </label>
                <select
                  id="limit"
                  className="form-select form-select-sm"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-list me-2"></i>
                Orders
              </h3>
              <div className="card-tools">
                <button
                  className="btn btn-tool"
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  title="Refresh"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="d-md-none px-3 pt-3 pb-0">
                <div className="text-muted small">
                  Menampilkan{" "}
                  <span className="fw-semibold">{items.length}</span> dari{" "}
                  <span className="fw-semibold">{pagination.total}</span> • Hal{" "}
                  <span className="fw-semibold">{pagination.page}</span>/
                  <span className="fw-semibold">{pagination.totalPages}</span>
                </div>
              </div>
              <ResponsiveTableToCards
                items={items}
                getRowKey={(o) => o.id}
                mobileContainerClassName="px-3 pt-2 pb-3"
                columns={[
                  {
                    header: "Tracking",
                    render: (o) => (
                      <Link
                        href={`/dashboard/orders/${encodeURIComponent(o.id)}`}
                        className="text-decoration-none"
                        title="Buka detail order"
                      >
                        <code>{o.trackingCode}</code>
                      </Link>
                    ),
                  },
                  ...(isGlobalMode
                    ? [
                      {
                        header: "Outlet",
                        render: (o: OrderRow) => (
                          <span className="badge bg-info">
                            {o.outletName || "-"}
                          </span>
                        ),
                      },
                    ]
                    : []),
                  {
                    header: "Pelanggan",
                    render: (o) =>
                      o.customerName || <span className="text-muted">-</span>,
                  },
                  {
                    header: "Status",
                    render: (o) => (
                      <span className={`badge ${statusBadge(o.status)}`}>
                        {labelStatus(o.status)}
                      </span>
                    ),
                  },
                  {
                    header: "Pembayaran",
                    render: (o) => (
                      <>
                        <span
                          className={`badge ${paymentBadge(o.paymentStatus)}`}
                        >
                          {labelPayment(o.paymentStatus)}
                        </span>
                        {o.paymentStatus === "PENDING" && (o.dpAmount ?? 0) > 0 && (
                          <div className="text-warning small fw-bold">
                            DP: {formatCurrency(o.dpAmount!)}
                          </div>
                        )}
                        {o.paidAt ? (
                          <div className="text-muted small">
                            {formatDateTime(o.paidAt)}
                          </div>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    header: "Total",
                    render: (o) => formatCurrency(o.totalAmount),
                  },
                  {
                    header: "Dibuat",
                    render: (o) => formatDateTime(o.createdAt),
                  },
                  {
                    header: "Aksi",
                    render: (o) => {
                      const nextStatus = getNextStatus(o.status);
                      return (
                        <div className="btn-group">
                          <Link
                            href={`/dashboard/orders/${encodeURIComponent(o.id)}`}
                            className="btn btn-sm btn-outline-info"
                            title="Lihat Detail"
                          >
                            <i className="fas fa-eye"></i>
                          </Link>
                          <Link
                            href={`/dashboard/orders/${encodeURIComponent(o.id)}/invoice`}
                            className="btn btn-sm btn-outline-success"
                            title="Lihat Struk"
                          >
                            <i className="fas fa-receipt"></i>
                          </Link>
                          {nextStatus ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void updateOrderStatus(
                                    o.id,
                                    o.status,
                                    nextStatus,
                                  );
                                }}
                                title={`Update ke ${labelStatus(nextStatus)}`}
                              >
                                <i className="fas fa-arrow-right"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary dropdown-toggle dropdown-toggle-split"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                onClick={(e) => e.stopPropagation()}
                                title="Pilih Status"
                              >
                                <span className="visually-hidden">
                                  Toggle Dropdown
                                </span>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <h6 className="dropdown-header">
                                    Ubah Status
                                  </h6>
                                </li>
                                {[
                                  "QUEUED",
                                  "WASHING",
                                  "DRYING",
                                  "IRONING",
                                  "READY",
                                  "TAKEN",
                                ].map((status) => (
                                  <li key={status}>
                                    <button
                                      className={`dropdown-item ${o.status === status ? "active" : ""}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void updateOrderStatus(
                                          o.id,
                                          o.status,
                                          status as OrderStatus,
                                        );
                                      }}
                                      disabled={o.status === status}
                                    >
                                      {labelStatus(status as OrderStatus)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <span
                              className="btn btn-sm btn-outline-dark disabled"
                              title="Order Selesai"
                            >
                              <i className="fas fa-check"></i>
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                emptyState={
                  <div className="text-center py-4">
                    <div className="text-muted">Tidak ada order.</div>
                    <Link
                      href="/dashboard/orders/new"
                      className="btn btn-primary btn-sm mt-2"
                    >
                      Buat Order Baru
                    </Link>
                  </div>
                }
                renderMobileCard={(o) => (
                  <div key={o.id} className="card shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className="text-muted small">Tracking</div>
                          <div className="fw-semibold">
                            <code>{o.trackingCode}</code>
                          </div>
                        </div>
                        <span className={`badge ${statusBadge(o.status)}`}>
                          {labelStatus(o.status)}
                        </span>
                      </div>

                      {isGlobalMode && o.outletName && (
                        <div className="mt-2">
                          <span className="badge bg-info">{o.outletName}</span>
                        </div>
                      )}

                      <div className="mt-2">
                        <div className="text-muted small">Pelanggan</div>
                        <div className="fw-semibold">
                          {o.customerName || "—"}
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <span
                          className={`badge ${paymentBadge(o.paymentStatus)}`}
                        >
                          {labelPayment(o.paymentStatus)}
                        </span>
                        {o.paidAt ? (
                          <span className="text-muted small">
                            {formatDateTime(o.paidAt)}
                          </span>
                        ) : null}
                      </div>

                      <hr className="my-3" />

                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="text-muted small">Total</div>
                          <div className="fw-semibold">
                            {formatCurrency(o.totalAmount)}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-muted small">Dibuat</div>
                          <div className="fw-semibold">
                            {formatDateTime(o.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-column gap-2 mt-3">
                        <Link
                          href={`/dashboard/orders/${encodeURIComponent(o.id)}/invoice`}
                          className="btn btn-success btn-sm"
                        >
                          <i className="fas fa-receipt me-1"></i>
                          Struk / Invoice
                        </Link>
                        {(() => {
                          const nextStatus = getNextStatus(o.status);
                          return nextStatus ? (
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm flex-fill"
                                onClick={() =>
                                  void updateOrderStatus(
                                    o.id,
                                    o.status,
                                    nextStatus,
                                  )
                                }
                              >
                                <i className="fas fa-arrow-right me-1"></i>
                                {labelStatus(nextStatus)}
                              </button>
                              <div className="btn-group dropup">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm dropdown-toggle"
                                  data-bs-toggle="dropdown"
                                  data-bs-display="static"
                                  aria-expanded="false"
                                >
                                  <i className="fas fa-ellipsis-v"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end shadow">
                                  <li>
                                    <h6 className="dropdown-header">
                                      Ubah Status
                                    </h6>
                                  </li>
                                  {[
                                    "QUEUED",
                                    "WASHING",
                                    "DRYING",
                                    "IRONING",
                                    "READY",
                                    "TAKEN",
                                  ].map((status) => (
                                    <li key={status}>
                                      <button
                                        className={`dropdown-item ${o.status === status ? "active" : ""}`}
                                        onClick={() =>
                                          void updateOrderStatus(
                                            o.id,
                                            o.status,
                                            status as OrderStatus,
                                          )
                                        }
                                        disabled={o.status === status}
                                      >
                                        {labelStatus(status as OrderStatus)}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <div className="alert alert-dark py-2 mb-0 text-center">
                              <i className="fas fa-check-circle me-1"></i>
                              Selesai
                            </div>
                          );
                        })()}
                        <Link
                          href={`/dashboard/orders/${encodeURIComponent(o.id)}`}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          <i className="fas fa-eye me-1"></i>
                          Detail
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-muted small">
                Total: <span className="fw-semibold">{pagination.total}</span> •
                Halaman <span className="fw-semibold">{pagination.page}</span>{" "}
                dari{" "}
                <span className="fw-semibold">{pagination.totalPages}</span>
              </div>
              <div
                className="btn-group btn-group-sm"
                role="group"
                aria-label="Pagination"
              >
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(1)}
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
                >
                  <i className="fas fa-angle-left"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage(
                      Math.min(pagination.totalPages, pagination.page + 1),
                    )
                  }
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB - Floating Action Button for Mobile */}
      <Link
        href="/dashboard/orders/new"
        className="md-fab d-md-none"
        title="Buat Order Baru"
      >
        <i className="fas fa-plus"></i>
      </Link>
    </div>
  );
}
