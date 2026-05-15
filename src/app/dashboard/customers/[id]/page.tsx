"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type OrderHistory = {
  id: string;
  trackingCode: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  completedAt: string | null;
};

type QuotaBalance = {
  type: 'KG' | 'PCS';
  balance: number;
};

type QuotaTransaction = {
  id: string;
  amount: number;
  type: string;
  quotaType: string;
  description: string | null;
  createdAt: string;
  package?: { name: string };
  order?: { trackingCode: string };
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isMember: boolean;
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
  
  const [quotas, setQuotas] = useState<QuotaBalance[]>([]);
  const [quotaTransactions, setQuotaTransactions] = useState<QuotaTransaction[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'quotas'>('orders');

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
    void fetchQuotas();
    void fetchAvailablePackages();
  }, [canFetch, id]);

  async function fetchQuotas() {
    try {
      const res = await fetch(`/api/dashboard/customers/${id}/quotas`);
      const json = await res.json();
      if (res.ok && json.success) {
        setQuotas(json.data.balances);
        setQuotaTransactions(json.data.transactions);
      }
    } catch (e) {
      console.error("Failed to fetch quotas:", e);
    }
  }

  async function fetchAvailablePackages() {
    try {
      const res = await fetch("/api/dashboard/member-packages?active=true");
      const json = await res.json();
      if (res.ok && json.success) {
        setAvailablePackages(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch packages:", e);
    }
  }

  async function handlePurchase(packageId: string) {
    const pkg = availablePackages.find(p => p.id === packageId);
    if (!pkg) return;

    const result = await Swal.fire({
      title: 'Konfirmasi Pembelian',
      text: `Pelanggan akan membeli ${pkg.name} seharga ${formatCurrency(pkg.price)}. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Proses',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    try {
      setPurchaseLoading(true);
      const res = await fetch(`/api/dashboard/customers/${id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memproses pembelian");
      }

      await Swal.fire('Berhasil!', 'Paket telah ditambahkan ke pelanggan.', 'success');
      setShowPurchaseModal(false);
      void fetchQuotas();
      // Reload customer to update isMember status
      const customerRes = await fetch(`/api/dashboard/customers/${id}`);
      const customerJson = await customerRes.json();
      if (customerRes.ok && customerJson.success) {
        setCustomer(customerJson.data);
      }
    } catch (e) {
      Swal.fire('Error!', e instanceof Error ? e.message : "Gagal memproses pembelian", 'error');
    } finally {
      setPurchaseLoading(false);
    }
  }

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

              {/* Membership Card */}
              <div className="card shadow-sm mb-3">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
                  <h3 className="card-title mb-0 fs-6">
                    <i className="fas fa-crown me-2"></i>
                    Membership & Kuota
                  </h3>
                  <button 
                    className="btn btn-light btn-xs text-primary fw-bold"
                    onClick={() => setShowPurchaseModal(true)}
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  >
                    BELI PAKET
                  </button>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Status Pelanggan</span>
                    <span className={`badge ${customer.isMember ? 'bg-success' : 'bg-secondary'}`}>
                      {customer.isMember ? 'MEMBER' : 'REGULER'}
                    </span>
                  </div>
                  
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="border rounded p-2 text-center bg-light">
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Sisa Kuota KG</div>
                        <div className="fw-bold fs-5">
                          {quotas.find(q => q.type === 'KG')?.balance || 0}
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-2 text-center bg-light">
                        <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Sisa Kuota PCS</div>
                        <div className="fw-bold fs-5">
                          {quotas.find(q => q.type === 'PCS')?.balance || 0}
                        </div>
                      </div>
                    </div>
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
              <div className="card shadow-sm">
                <div className="card-header p-0 border-bottom-0">
                  <ul className="nav nav-tabs" id="customer-tabs" role="tablist">
                    <li className="nav-item" role="presentation">
                      <button 
                        className={`nav-link py-3 px-4 fw-bold ${activeTab === 'orders' ? 'active border-top-primary' : 'text-muted'}`} 
                        onClick={() => setActiveTab('orders')}
                      >
                        <i className="fas fa-receipt me-2"></i>
                        Riwayat Transaksi
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button 
                        className={`nav-link py-3 px-4 fw-bold ${activeTab === 'quotas' ? 'active border-top-primary' : 'text-muted'}`} 
                        onClick={() => setActiveTab('quotas')}
                      >
                        <i className="fas fa-history me-2"></i>
                        Riwayat Kuota
                      </button>
                    </li>
                  </ul>
                </div>
                <div className="card-body p-0">
                  {activeTab === 'orders' ? (
                    orders.length === 0 ? (
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
                              <td className="text-end fw-bold">
                                {formatCurrency(order.totalAmount)}
                              </td>
                              <td className="text-end">
                                <Link
                                  href={`/dashboard/orders/${order.id}`}
                                  className="btn btn-xs btn-outline-primary"
                                >
                                  <i className="fas fa-eye"></i>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )
                  ) : (
                    quotaTransactions.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="fas fa-history fa-3x mb-3 opacity-50"></i>
                        <p className="mb-0">Belum ada riwayat kuota</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-striped mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Tanggal</th>
                              <th>Tipe</th>
                              <th>Jumlah</th>
                              <th>Deskripsi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotaTransactions.map((tx) => (
                              <tr key={tx.id}>
                                <td className="small">{formatDateTime(tx.createdAt)}</td>
                                <td>
                                  <span className={`badge ${tx.type === 'PURCHASE' ? 'bg-success' : 'bg-warning'}`}>
                                    {tx.type}
                                  </span>
                                </td>
                                <td className={`fw-bold ${tx.type === 'USAGE' ? 'text-danger' : 'text-success'}`}>
                                  {tx.type === 'USAGE' ? '-' : '+'}{tx.amount} {tx.quotaType}
                                </td>
                                <td className="small">
                                  {tx.description}
                                  {tx.package && <div className="text-muted small">Paket: {tx.package.name}</div>}
                                  {tx.order && <div className="text-muted small">Order: #{tx.order.trackingCode}</div>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
                {(activeTab === 'orders' && orders.length > 0 && totalOrders > orders.length) && (
                  <div className="card-footer text-center text-muted small">
                    Menampilkan {orders.length} dari {totalOrders} transaksi
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPurchaseModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow">
                <div className="modal-header">
                  <h5 className="modal-title">Topup Kuota / Beli Paket</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPurchaseModal(false)}></button>
                </div>
                <div className="modal-body">
                  {availablePackages.length === 0 ? (
                    <p className="text-center text-muted py-3">Belum ada paket tersedia.</p>
                  ) : (
                    <div className="list-group list-group-flush">
                      {availablePackages.map(pkg => (
                        <button
                          key={pkg.id}
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                          onClick={() => handlePurchase(pkg.id)}
                          disabled={purchaseLoading}
                        >
                          <div>
                            <div className="fw-bold text-primary">{pkg.name}</div>
                            <div className="text-muted small">
                              {pkg.quota} {pkg.type} • {pkg.expiryDays ? `${pkg.expiryDays} Hari` : 'Tanpa Batas'}
                            </div>
                          </div>
                          <div className="fw-bold">{formatCurrency(pkg.price)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPurchaseModal(false)}>Batal</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}
