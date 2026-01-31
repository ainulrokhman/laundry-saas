/**
 * Dashboard Homepage
 *
 * Displays dashboard statistics and recent orders for the authenticated outlet.
 * Uses AdminLTE Info Box widgets for statistics display.
 */

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ResponsiveTableToCards } from "@/components/adminlte/ResponsiveTableToCards";

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  pendingOrders: number;
  totalCustomers: number;
}

interface RecentOrder {
  id: string;
  trackingCode: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  outletId?: string;
  outletName?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlobalMode, setIsGlobalMode] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session) {
      const user = session.user as any;
      // Redirect SUPERADMIN to admin panel (they don't have outletId)
      if (user?.role === "SUPERADMIN") {
        router.push("/admin");
        return;
      }

      // OWNER can access in global mode (no outletId), STAFF requires outlet
      if (user?.role === "OWNER" || user?.outletId) {
        fetchDashboardData();
      } else {
        setError("Outlet context required. Silakan hubungi administrator.");
        setLoading(false);
      }
    }
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats and recent orders in parallel
      const [statsResponse, ordersResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/recent-orders?limit=10"),
      ]);

      // Handle stats response
      let statsData;
      try {
        statsData = await statsResponse.json();
      } catch (e) {
        throw new Error("Failed to parse dashboard statistics response");
      }

      if (!statsResponse.ok) {
        const errorMessage =
          statsData?.error ||
          statsData?.message ||
          "Failed to fetch dashboard statistics";
        throw new Error(errorMessage);
      }

      if (!statsData.success) {
        throw new Error(statsData.error || "Gagal memuat statistik dashboard");
      }

      setStats(statsData.data);
      setIsGlobalMode(statsData.isGlobalMode || false);

      // Handle orders response (non-critical, don't fail entire page if this fails)
      let ordersData;
      try {
        ordersData = await ordersResponse.json();
        if (ordersResponse.ok && ordersData.success) {
          setRecentOrders(ordersData.data);
        } else {
          console.warn(
            "Failed to load recent orders:",
            ordersData?.error || "Unknown error",
          );
          // Set empty array as fallback
          setRecentOrders([]);
        }
      } catch (e) {
        console.warn("Failed to parse recent orders response:", e);
        setRecentOrders([]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      QUEUED: "bg-info",
      WASHING: "bg-warning",
      DRYING: "bg-primary",
      IRONING: "bg-secondary",
      READY: "bg-success",
      TAKEN: "bg-dark",
    };
    return statusMap[status] || "bg-secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      QUEUED: "Antri",
      WASHING: "Cuci",
      DRYING: "Kering",
      IRONING: "Setrika",
      READY: "Siap",
      TAKEN: "Diambil",
    };
    return labels[status] || status;
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      UNPAID: "bg-danger",
      PENDING: "bg-warning",
      SETTLEMENT: "bg-success",
      FAILURE: "bg-danger",
    };
    return statusMap[status] || "bg-secondary";
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      UNPAID: "Belum Dibayar",
      PENDING: "Menunggu",
      SETTLEMENT: "Lunas",
      FAILURE: "Gagal",
    };
    return labels[status] || status;
  };

  if (status === "loading" || loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Memuat...</span>
        </div>
        <p className="text-muted">Memuat dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-danger shadow-sm" style={{ maxWidth: "500px", margin: "24px auto" }}>
        <div className="card-body text-center py-5">
          <div className="mb-3 d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle" style={{ width: "64px", height: "64px", fontSize: "28px" }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h4 className="card-title mb-2">Terjadi Kesalahan</h4>
          <p className="card-text text-muted mb-4">{error}</p>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            <i className="fas fa-redo me-2"></i>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Global Mode Banner */}
      {isGlobalMode && (
        <div className="alert alert-info mb-3">
          <i className="fas fa-globe me-2"></i>
          <strong>Mode Global:</strong> Menampilkan data dari semua outlet Anda.
        </div>
      )}

      {/* Info Boxes */}
      <div className="row">
        {/* Order Hari Ini */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-primary">
            <div className="inner">
              <h3>{stats?.ordersToday || 0}</h3>
              <p>Order Hari Ini</p>
            </div>
            <svg
              className="small-box-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"></path>
            </svg>
            <Link
              href="/dashboard/orders"
              className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover"
            >
              Selengkapnya <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Omzet Hari Ini */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-success">
            <div className="inner">
              <h3>{formatCurrency(stats?.revenueToday || 0)}</h3>
              <p>Omzet Hari Ini</p>
            </div>
            <svg
              className="small-box-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.214 2.214 0 01-.921.42z"></path>
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-1.06.06l-.75.75a.75.75 0 001.06 1.061l.879-.66c.533-.4 1.169-.645 1.821-.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.75c.712-.566 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a4.124 4.124 0 00-1.821-.75V6z"
              ></path>
            </svg>
            <Link
              href="/dashboard/transactions"
              className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover"
            >
              Selengkapnya <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Cucian Tertunda */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-warning">
            <div className="inner">
              <h3>{stats?.pendingOrders || 0}</h3>
              <p>Cucian Tertunda</p>
            </div>
            <svg
              className="small-box-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6a.75.75 0 001.5 0V6zm-3 2.25a.75.75 0 00-1.5 0v3.75a.75.75 0 001.5 0V8.25zM18 10.5a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V10.5zM8.25 18a.75.75 0 000-1.5H5.625a1.125 1.125 0 010-2.25h2.625a.75.75 0 000-1.5H5.625a2.625 2.625 0 000 5.25h2.625z"
                clipRule="evenodd"
              ></path>
            </svg>
            <Link
              href="/dashboard/orders"
              className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover"
            >
              Selengkapnya <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Total Pelanggan */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-danger">
            <div className="inner">
              <h3>{stats?.totalCustomers || 0}</h3>
              <p>Total Pelanggan</p>
            </div>
            <svg
              className="small-box-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"></path>
            </svg>
            <Link
              href="/dashboard/customers"
              className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover"
            >
              Selengkapnya <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-list me-1"></i>
                Order Terbaru
              </h3>
              <div className="card-tools">
                <Link
                  href="/dashboard/orders"
                  className="btn btn-sm btn-primary"
                >
                  <i className="fas fa-eye"></i> Lihat Semua
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="d-md-none px-3 pt-3 pb-0">
                <div className="text-muted small">
                  Total:{" "}
                  <span className="fw-semibold">{recentOrders.length}</span>{" "}
                  order
                </div>
              </div>
              <ResponsiveTableToCards
                items={recentOrders}
                getRowKey={(o) => o.id}
                mobileContainerClassName="px-3 pt-2 pb-3"
                columns={[
                  {
                    header: "Tracking Code",
                    render: (order) => <code>{order.trackingCode}</code>,
                  },
                  ...(isGlobalMode
                    ? [
                      {
                        header: "Outlet",
                        render: (order: RecentOrder) => (
                          <span className="badge bg-info">
                            {order.outletName || "-"}
                          </span>
                        ),
                      },
                    ]
                    : []),
                  {
                    header: "Pelanggan",
                    render: (order) => order.customerName,
                  },
                  {
                    header: "Status",
                    render: (order) => (
                      <span
                        className={`badge ${getStatusBadgeClass(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    ),
                  },
                  {
                    header: "Pembayaran",
                    render: (order) => (
                      <span
                        className={`badge ${getPaymentStatusBadgeClass(order.paymentStatus)}`}
                      >
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </span>
                    ),
                  },
                  {
                    header: "Total",
                    render: (order) => formatCurrency(order.totalAmount),
                  },
                  {
                    header: "Tanggal",
                    render: (order) => formatDateTime(order.createdAt),
                  },
                  {
                    header: "Aksi",
                    render: (order) => (
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="btn btn-sm btn-info"
                      >
                        <i className="fas fa-eye"></i> Detail
                      </Link>
                    ),
                  },
                ]}
                emptyState={
                  <div className="text-center py-4">
                    <p className="text-muted mb-0">
                      Belum ada order. Mulai dengan membuat order baru.
                    </p>
                    <Link
                      href="/dashboard/orders/new"
                      className="btn btn-primary btn-sm mt-2"
                    >
                      Buat Order Baru
                    </Link>
                  </div>
                }
                renderMobileCard={(order) => (
                  <div key={order.id} className="card shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className="text-muted small">Tracking code</div>
                          <div className="fw-semibold">
                            <code>{order.trackingCode}</code>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <i className="fas fa-eye me-1"></i>
                          Detail
                        </Link>
                      </div>

                      {isGlobalMode && order.outletName && (
                        <div className="mt-2">
                          <span className="badge bg-info">
                            {order.outletName}
                          </span>
                        </div>
                      )}

                      <div className="mt-2">
                        <div className="text-muted small">Pelanggan</div>
                        <div className="fw-semibold">
                          {order.customerName || "—"}
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <span
                          className={`badge ${getStatusBadgeClass(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                        <span
                          className={`badge ${getPaymentStatusBadgeClass(order.paymentStatus)}`}
                        >
                          {getPaymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>

                      <hr className="my-3" />

                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="text-muted small">Total</div>
                          <div className="fw-semibold">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-muted small">Tanggal</div>
                          <div className="fw-semibold">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
