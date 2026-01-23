/**
 * Dashboard Homepage
 * 
 * Displays dashboard statistics and recent orders for the authenticated outlet.
 * Uses AdminLTE Info Box widgets for statistics display.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/lib/utils';

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
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session) {
      const user = session.user as any;
      // Redirect SUPERADMIN to admin panel (they don't have outletId)
      if (user?.role === 'SUPERADMIN') {
        router.push('/admin/outlets');
        return;
      }
      
      // Only fetch dashboard data if user has outletId (OWNER or STAFF)
      if (user?.outletId) {
        fetchDashboardData();
      } else {
        setError('Outlet context required. Please contact administrator.');
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
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/recent-orders?limit=10'),
      ]);

      // Handle stats response
      let statsData;
      try {
        statsData = await statsResponse.json();
      } catch (e) {
        throw new Error('Failed to parse dashboard statistics response');
      }

      if (!statsResponse.ok) {
        const errorMessage = statsData?.error || statsData?.message || 'Failed to fetch dashboard statistics';
        throw new Error(errorMessage);
      }

      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to load dashboard statistics');
      }

      setStats(statsData.data);

      // Handle orders response (non-critical, don't fail entire page if this fails)
      let ordersData;
      try {
        ordersData = await ordersResponse.json();
        if (ordersResponse.ok && ordersData.success) {
          setRecentOrders(ordersData.data);
        } else {
          console.warn('Failed to load recent orders:', ordersData?.error || 'Unknown error');
          // Set empty array as fallback
          setRecentOrders([]);
        }
      } catch (e) {
        console.warn('Failed to parse recent orders response:', e);
        setRecentOrders([]);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      QUEUED: 'bg-info',
      WASHING: 'bg-warning',
      DRYING: 'bg-primary',
      IRONING: 'bg-secondary',
      READY: 'bg-success',
      TAKEN: 'bg-dark',
    };
    return statusMap[status] || 'bg-secondary';
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      UNPAID: 'bg-danger',
      PENDING: 'bg-warning',
      SETTLEMENT: 'bg-success',
      FAILURE: 'bg-danger',
    };
    return statusMap[status] || 'bg-secondary';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Error!</h4>
              <p>{error}</p>
              <hr />
              <button
                className="btn btn-primary"
                onClick={fetchDashboardData}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Dashboard</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Home</Link>
                </li>
                <li className="breadcrumb-item active">Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="content">
        <div className="container-fluid">
          {/* Info Boxes */}
          <div className="row">
            {/* Order Hari Ini */}
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{stats?.ordersToday || 0}</h3>
                  <p>Order Hari Ini</p>
                </div>
                <div className="icon">
                  <i className="fas fa-shopping-cart"></i>
                </div>
                <Link href="/dashboard/orders" className="small-box-footer">
                  Lihat Detail <i className="fas fa-arrow-circle-right"></i>
                </Link>
              </div>
            </div>

            {/* Omzet Hari Ini */}
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{formatCurrency(stats?.revenueToday || 0)}</h3>
                  <p>Omzet Hari Ini</p>
                </div>
                <div className="icon">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <Link href="/dashboard/transactions" className="small-box-footer">
                  Lihat Detail <i className="fas fa-arrow-circle-right"></i>
                </Link>
              </div>
            </div>

            {/* Cucian Tertunda */}
            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>{stats?.pendingOrders || 0}</h3>
                  <p>Cucian Tertunda</p>
                </div>
                <div className="icon">
                  <i className="fas fa-clock"></i>
                </div>
                <Link href="/dashboard/orders" className="small-box-footer">
                  Lihat Detail <i className="fas fa-arrow-circle-right"></i>
                </Link>
              </div>
            </div>

            {/* Total Pelanggan */}
            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>{stats?.totalCustomers || 0}</h3>
                  <p>Total Pelanggan</p>
                </div>
                <div className="icon">
                  <i className="fas fa-users"></i>
                </div>
                <Link href="/dashboard/customers" className="small-box-footer">
                  Lihat Detail <i className="fas fa-arrow-circle-right"></i>
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
                    <i className="fas fa-list mr-1"></i>
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
                <div className="card-body table-responsive p-0">
                  <table className="table table-hover text-nowrap">
                    <thead>
                      <tr>
                        <th>Tracking Code</th>
                        <th>Pelanggan</th>
                        <th>Status</th>
                        <th>Pembayaran</th>
                        <th>Total</th>
                        <th>Tanggal</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4">
                            <p className="text-muted mb-0">
                              Belum ada order. Mulai dengan membuat order baru.
                            </p>
                            <Link
                              href="/dashboard/orders/new"
                              className="btn btn-primary btn-sm mt-2"
                            >
                              Buat Order Baru
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td>
                              <code>{order.trackingCode}</code>
                            </td>
                            <td>{order.customerName}</td>
                            <td>
                              <span
                                className={`badge ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${getPaymentStatusBadgeClass(
                                  order.paymentStatus
                                )}`}
                              >
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td>{formatCurrency(order.totalAmount)}</td>
                            <td>{formatDateTime(order.createdAt)}</td>
                            <td>
                              <Link
                                href={`/dashboard/orders/${order.id}`}
                                className="btn btn-sm btn-info"
                              >
                                <i className="fas fa-eye"></i> Detail
                              </Link>
                            </td>
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
      </section>
    </div>
  );
}
