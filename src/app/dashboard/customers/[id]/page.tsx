"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDateTime, formatCurrency } from "@/lib/utils";

type OrderHistory = {
  id: string;
  trackingCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  completedAt: string | null;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
  orders?: OrderHistory[];
};

// Status badge helpers
function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    QUEUED: "bg-secondary",
    WASHING: "bg-info",
    DRYING: "bg-primary",
    IRONING: "bg-warning",
    READY: "bg-success",
    TAKEN: "bg-dark",
  };
  return badges[status] || "bg-secondary";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    QUEUED: "Antrian",
    WASHING: "Cuci",
    DRYING: "Kering",
    IRONING: "Setrika",
    READY: "Siap",
    TAKEN: "Diambil",
  };
  return labels[status] || status;
}

function getPaymentBadge(status: string): string {
  const badges: Record<string, string> = {
    UNPAID: "bg-danger",
    PENDING: "bg-warning",
    SETTLEMENT: "bg-success",
    FAILURE: "bg-dark",
  };
  return badges[status] || "bg-secondary";
}

function getPaymentLabel(status: string): string {
  const labels: Record<string, string> = {
    UNPAID: "Belum Bayar",
    PENDING: "DP",
    SETTLEMENT: "Lunas",
    FAILURE: "Gagal",
  };
  return labels[status] || status;
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (role !== "OWNER" && role !== "STAFF") {
        router.push("/dashboard");
      } else if (!user?.outletId) {
        setError("Outlet context required.");
        setLoading(false);
      }
    }
  }, [status, router, role, user?.outletId]);

  const canFetch =
    status === "authenticated" &&
    (role === "OWNER" || role === "STAFF") &&
    !!user?.outletId &&
    !!id;

  useEffect(() => {
    if (!canFetch) return;
    async function fetchCustomer() {
      try {
        setLoading(true);
        // Fetch with orders included
        const res = await fetch(
          `/api/dashboard/customers/${id}?include=orders`,
        );
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          if (res.status === 404) {
            setError("Pelanggan tidak ditemukan");
          } else {
            throw new Error(
              json?.message || json?.error || "Gagal memuat detail pelanggan",
            );
          }
          return;
        }

        setCustomer(json.data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Gagal memuat detail pelanggan",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [canFetch, id]);

  if (loading) {
    return (
      <div className="content-wrapper">
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "50vh" }}
        >
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="content-wrapper">
        <div className="content p-4">
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error || "Data pelanggan tidak ditemukan"}
          </div>
          <Link href="/dashboard/customers" className="btn btn-secondary">
            <i className="fas fa-arrow-left me-1"></i> Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  const orders = customer.orders || [];
  const totalOrders = customer._count?.orders ?? orders.length;

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Detail Pelanggan</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/customers">Pelanggan</Link>
                </li>
                <li className="breadcrumb-item active">{customer.name}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {/* Profile Card */}
              <div className="card shadow-sm mb-3">
                <div className="card-body box-profile text-center">
                  <div className="text-center mb-3">
                    <div
                      className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: "80px",
                        height: "80px",
                        fontSize: "2rem",
                      }}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="profile-username text-center">
                    {customer.name}
                  </h3>
                  <p className="text-muted text-center mb-1">
                    {customer.phone || "No Phone"}
                  </p>
                  <p className="text-muted text-center small">
                    <i className="fas fa-map-marker-alt me-1"></i>{" "}
                    {customer.address || "Belum ada alamat"}
                  </p>

                  <div className="d-grid gap-2 mt-4">
                    <span className="btn btn-outline-primary btn-sm">
                      <i className="fas fa-history me-1"></i> Total Order:{" "}
                      {totalOrders}
                    </span>
                    <Link
                      href="/dashboard/customers"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="fas fa-arrow-left me-1"></i> Kembali
                    </Link>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">Informasi Detail</h3>
                </div>
                <div className="card-body">
                  <strong>
                    <i className="fas fa-envelope me-1"></i> Email
                  </strong>
                  <p className="text-muted">{customer.email || "-"}</p>
                  <hr />
                  <strong>
                    <i className="far fa-calendar-alt me-1"></i> Terdaftar
                  </strong>
                  <p className="text-muted">
                    {formatDateTime(customer.createdAt)}
                  </p>
                  <hr />
                  <strong>
                    <i className="far fa-clock me-1"></i> Terakhir Update
                  </strong>
                  <p className="text-muted">
                    {formatDateTime(customer.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-8">
              {/* Order History */}
              <div className="card shadow-sm">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-history me-2"></i>
                    Riwayat Transaksi
                  </h3>
                </div>
                <div className="card-body p-0">
                  {orders.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-receipt fa-3x mb-3 opacity-50"></i>
                      <p className="mb-0">Belum ada transaksi</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Kode</th>
                            <th>Tanggal</th>
                            <th>Status</th>
                            <th>Pembayaran</th>
                            <th className="text-end">Total</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <code className="text-primary">
                                  {order.trackingCode}
                                </code>
                              </td>
                              <td className="text-muted small">
                                {formatDateTime(order.createdAt)}
                              </td>
                              <td>
                                <span
                                  className={`badge ${getStatusBadge(order.status)}`}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${getPaymentBadge(order.paymentStatus)}`}
                                >
                                  {getPaymentLabel(order.paymentStatus)}
                                </span>
                              </td>
                              <td className="text-end fw-semibold">
                                {formatCurrency(order.totalAmount)}
                              </td>
                              <td>
                                <Link
                                  href={`/dashboard/orders/${order.id}`}
                                  className="btn btn-sm btn-outline-primary"
                                  title="Lihat Detail"
                                >
                                  <i className="fas fa-eye"></i>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {orders.length > 0 && totalOrders > orders.length && (
                  <div className="card-footer text-center text-muted small">
                    Menampilkan {orders.length} dari {totalOrders} transaksi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
