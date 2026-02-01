/**
 * Admin Dashboard Overview Page (SUPERADMIN)
 * 
 * Modern SaaS dashboard with:
 * - KPI small-box widgets
 * - Info-box for detailed stats
 * - Revenue trend chart (ApexCharts)
 * - Package distribution chart
 * - Recent payments and users tables
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { Role, PaymentStatus } from '@/generated/prisma';
import { formatCurrency, formatDateTime } from '@/lib/utils';

// Dynamic import for ApexCharts (no SSR)
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ============================================
// Types
// ============================================

interface UserStats {
  total: number;
  owners: number;
  staff: number;
  superadmins: number;
  activeUsers: number;
}

interface OutletStats {
  total: number;
  withActiveOwner: number;
}

interface SubscriptionStats {
  active: number;
  expiringSoon: number;
  expired: number;
  noSubscription: number;
}

interface RevenueStats {
  monthly: number;
  total: number;
}

interface PendingPaymentStats {
  count: number;
  totalAmount: number;
}

interface PackageDistribution {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  packageName: string | null;
  userName: string | null;
  createdAt: string;
}

interface RecentUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  packageName: string | null;
  createdAt: string;
}

interface DashboardStats {
  users: UserStats;
  outlets: OutletStats;
  subscriptions: SubscriptionStats;
  revenue: RevenueStats;
  pendingPayments: PendingPaymentStats;
  packageDistribution: PackageDistribution[];
  revenueByMonth: MonthlyRevenue[];
  recentPayments: RecentPayment[];
  recentUsers: RecentUser[];
}

// ============================================
// Component
// ============================================

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role as Role | undefined;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      if (userRole !== Role.SUPERADMIN) {
        router.push('/dashboard');
        return;
      }

      fetchDashboardStats();
    }
  }, [status, userRole, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/dashboard/stats');
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memuat statistik');
      }

      setStats(json.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat statistik');

      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Gagal memuat statistik dashboard',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PENDING:
        return { class: 'bg-warning', text: 'Menunggu' };
      case PaymentStatus.SETTLEMENT:
        return { class: 'bg-success', text: 'Disetujui' };
      case PaymentStatus.FAILURE:
        return { class: 'bg-danger', text: 'Ditolak' };
      case PaymentStatus.UNPAID:
        return { class: 'bg-secondary', text: 'Belum Bayar' };
      default:
        return { class: 'bg-secondary', text: status };
    }
  };

  // Chart configurations
  const revenueChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [50, 100],
      },
    },
    xaxis: {
      categories: stats?.revenueByMonth.map((r) => r.month) || [],
    },
    yaxis: {
      labels: {
        formatter: (value) => formatCurrency(value),
      },
    },
    tooltip: {
      y: {
        formatter: (value) => formatCurrency(value),
      },
    },
    colors: ['#0d6efd'],
  };

  const revenueChartSeries = [
    {
      name: 'Revenue',
      data: stats?.revenueByMonth.map((r) => r.revenue) || [],
    },
  ];

  const packageChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      height: 350,
    },
    labels: stats?.packageDistribution.map((p) => p.name) || [],
    colors: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'],
    legend: {
      position: 'bottom',
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Users',
              formatter: () => {
                const total = stats?.packageDistribution.reduce((sum, p) => sum + p.count, 0) || 0;
                return total.toString();
              },
            },
          },
        },
      },
    },
  };

  const packageChartSeries = stats?.packageDistribution.map((p) => p.count) || [];

  if (status === 'loading' || loading) {
    return (
      <div className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted mt-2">Memuat dashboard...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error!
        </h4>
        <p>{error}</p>
        <hr />
        <button className="btn btn-primary" onClick={fetchDashboardStats}>
          <i className="fas fa-redo me-1"></i>
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1">Dashboard Admin</h1>
          <p className="text-muted mb-0">Overview statistik platform SaaS</p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={fetchDashboardStats}
          disabled={loading}
        >
          <i className="fas fa-sync-alt me-1"></i>
          Refresh
        </button>
      </div>

      {/* Row 1: KPI Small Boxes */}
      <div className="row">
        {/* Total Users */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-primary">
            <div className="inner">
              <h3>{stats?.users.total || 0}</h3>
              <p>Total Users</p>
            </div>
            <svg className="small-box-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"></path>
            </svg>
            <Link href="/admin/users" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Kelola Users <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Total Outlets */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-success">
            <div className="inner">
              <h3>{stats?.outlets.total || 0}</h3>
              <p>Total Outlets</p>
            </div>
            <svg className="small-box-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z"></path>
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z"></path>
            </svg>
            <Link href="/admin/outlets" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Kelola Outlets <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-info">
            <div className="inner">
              <h3>{stats?.subscriptions.active || 0}</h3>
              <p>Subscription Aktif</p>
            </div>
            <svg className="small-box-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"></path>
            </svg>
            <Link href="/admin/subscriptions" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Kelola Subscription <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="col-lg-3 col-6">
          <div className="small-box text-bg-warning">
            <div className="inner">
              <h3>{formatCurrency(stats?.revenue.monthly || 0)}</h3>
              <p>Revenue Bulan Ini</p>
            </div>
            <svg className="small-box-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.214 2.214 0 01-.921.42z"></path>
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.712-.567 1.112-1.35 1.112-2.178 0-.829-.4-1.612-1.113-2.178a4.125 4.125 0 00-1.82-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clipRule="evenodd"></path>
            </svg>
            <Link href="/admin/payments" className="small-box-footer link-dark link-underline-opacity-0 link-underline-opacity-50-hover">
              Lihat Pembayaran <i className="bi bi-link-45deg"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Info Boxes */}
      <div className="row">
        {/* Pending Payments */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="info-box">
            <span className="info-box-icon bg-warning elevation-1">
              <i className="fas fa-clock"></i>
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Pembayaran Pending</span>
              <span className="info-box-number">{stats?.pendingPayments.count || 0}</span>
              <small className="text-muted">{formatCurrency(stats?.pendingPayments.totalAmount || 0)}</small>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="info-box">
            <span className="info-box-icon bg-danger elevation-1">
              <i className="fas fa-exclamation-triangle"></i>
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Akan Expired (7 hari)</span>
              <span className="info-box-number">{stats?.subscriptions.expiringSoon || 0}</span>
              <small className="text-muted">user</small>
            </div>
          </div>
        </div>

        {/* Expired */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="info-box">
            <span className="info-box-icon bg-secondary elevation-1">
              <i className="fas fa-times-circle"></i>
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Subscription Expired</span>
              <span className="info-box-number">{stats?.subscriptions.expired || 0}</span>
              <small className="text-muted">user</small>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="col-12 col-sm-6 col-md-3">
          <div className="info-box">
            <span className="info-box-icon bg-success elevation-1">
              <i className="fas fa-wallet"></i>
            </span>
            <div className="info-box-content">
              <span className="info-box-text">Total Revenue</span>
              <span className="info-box-number fs-6">{formatCurrency(stats?.revenue.total || 0)}</span>
              <small className="text-muted">all time</small>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: User Stats Mini Boxes */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-users me-2"></i>
                Statistik User
              </h3>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 col-md-3 border-end">
                  <h4 className="text-primary mb-1">{stats?.users.owners || 0}</h4>
                  <small className="text-muted">Owner</small>
                </div>
                <div className="col-6 col-md-3 border-end-md">
                  <h4 className="text-info mb-1">{stats?.users.staff || 0}</h4>
                  <small className="text-muted">Staff</small>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <h4 className="text-danger mb-1">{stats?.users.superadmins || 0}</h4>
                  <small className="text-muted">SuperAdmin</small>
                </div>
                <div className="col-6 col-md-3">
                  <h4 className="text-success mb-1">{stats?.users.activeUsers || 0}</h4>
                  <small className="text-muted">User Aktif</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Charts */}
      <div className="row">
        {/* Revenue Trend Chart */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-chart-line me-2"></i>
                Trend Revenue (6 Bulan Terakhir)
              </h3>
            </div>
            <div className="card-body">
              {typeof window !== 'undefined' && stats && (
                <Chart
                  options={revenueChartOptions}
                  series={revenueChartSeries}
                  type="area"
                  height={350}
                />
              )}
            </div>
          </div>
        </div>

        {/* Package Distribution Chart */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-chart-pie me-2"></i>
                Distribusi Paket
              </h3>
            </div>
            <div className="card-body">
              {typeof window !== 'undefined' && stats && packageChartSeries.length > 0 ? (
                <Chart
                  options={packageChartOptions}
                  series={packageChartSeries}
                  type="donut"
                  height={350}
                />
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-chart-pie fa-3x mb-3"></i>
                  <p>Belum ada data paket</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Recent Activity Tables */}
      <div className="row mt-3">
        {/* Recent Payments */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-money-check-alt me-2"></i>
                Pembayaran Terbaru
              </h3>
              <div className="card-tools">
                <Link href="/admin/payments" className="btn btn-sm btn-primary">
                  <i className="fas fa-eye me-1"></i>
                  Lihat Semua
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>User</th>
                      <th>Paket</th>
                      <th>Jumlah</th>
                      <th>Status</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">
                          Belum ada pembayaran
                        </td>
                      </tr>
                    ) : (
                      stats?.recentPayments.map((payment) => {
                        const statusBadge = getPaymentStatusBadge(payment.status);
                        return (
                          <tr key={payment.id}>
                            <td>{payment.userName || '-'}</td>
                            <td>{payment.packageName || '-'}</td>
                            <td className="fw-bold">{formatCurrency(payment.amount)}</td>
                            <td>
                              <span className={`badge ${statusBadge.class}`}>
                                {statusBadge.text}
                              </span>
                            </td>
                            <td>{formatDateTime(payment.createdAt)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-user-plus me-2"></i>
                User Terbaru
              </h3>
              <div className="card-tools">
                <Link href="/admin/users" className="btn btn-sm btn-primary">
                  <i className="fas fa-eye me-1"></i>
                  Lihat Semua
                </Link>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nama</th>
                      <th>No. Telepon</th>
                      <th>Paket</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-muted">
                          Belum ada user baru
                        </td>
                      </tr>
                    ) : (
                      stats?.recentUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>
                            <code>{user.phone}</code>
                          </td>
                          <td>
                            {user.packageName ? (
                              <span className="badge bg-primary">{user.packageName}</span>
                            ) : (
                              <span className="badge bg-secondary">-</span>
                            )}
                          </td>
                          <td>{formatDateTime(user.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-rocket me-2"></i>
                Aksi Cepat
              </h3>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                <Link href="/admin/payments" className="btn btn-warning">
                  <i className="fas fa-clock me-1"></i>
                  Verifikasi Pembayaran ({stats?.pendingPayments.count || 0})
                </Link>
                <Link href="/admin/packages" className="btn btn-info">
                  <i className="fas fa-box me-1"></i>
                  Kelola Paket
                </Link>
                <Link href="/admin/outlets" className="btn btn-success">
                  <i className="fas fa-store me-1"></i>
                  Kelola Outlets
                </Link>
                <Link href="/admin/users" className="btn btn-primary">
                  <i className="fas fa-users me-1"></i>
                  Kelola Users
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
