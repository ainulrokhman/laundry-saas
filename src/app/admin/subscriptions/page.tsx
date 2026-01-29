'use client';

/**
 * Admin Subscriptions List Page (SUPERADMIN)
 * 
 * View all outlet subscriptions and their status
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SubscriptionItem {
    outletId: string;
    outletName: string;
    outletSlug: string;
    tier: string | null;
    expiresAt: string | null;
    startedAt: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    ownerName: string | null;
    ownerPhone: string | null;
}

interface Stats {
    totalOutlets: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    pendingPayments: number;
    totalRevenue: number;
}

export default function AdminSubscriptionsPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subsRes, statsRes] = await Promise.all([
                fetch('/api/admin/subscriptions'),
                fetch('/api/admin/subscriptions/stats'),
            ]);

            if (subsRes.ok) {
                const data = await subsRes.json();
                setSubscriptions(data.data);
            }

            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="content-wrapper">
                <div className="content-header">
                    <h1>Subscriptions</h1>
                </div>
                <section className="content">
                    <div className="text-center">Loading...</div>
                </section>
            </div>
        );
    }

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Subscription Management</h1>
                        </div>
                        <div className="col-sm-6">
                            <button
                                className="btn btn-primary float-right"
                                onClick={() => router.push('/admin/subscriptions/pending')}
                            >
                                View Pending Payments ({stats?.pendingPayments || 0})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {/* Statistics */}
                    {stats && (
                        <div className="row">
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-info">
                                    <div className="inner">
                                        <h3>{stats.totalOutlets}</h3>
                                        <p>Total Outlets</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-store"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-success">
                                    <div className="inner">
                                        <h3>{stats.activeSubscriptions}</h3>
                                        <p>Active Subscriptions</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-check-circle"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-warning">
                                    <div className="inner">
                                        <h3>{stats.pendingPayments}</h3>
                                        <p>Pending Payments</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-clock"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-danger">
                                    <div className="inner">
                                        <h3>{stats.expiredSubscriptions}</h3>
                                        <p>Expired</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-times-circle"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subscriptions Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">All Outlet Subscriptions</h3>
                        </div>
                        <div className="card-body">
                            <table className="table table-bordered table-hover">
                                <thead>
                                    <tr>
                                        <th>Outlet</th>
                                        <th>Owner</th>
                                        <th>Tier</th>
                                        <th>Expires At</th>
                                        <th>Days Remaining</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center">
                                                No subscriptions
                                            </td>
                                        </tr>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <tr key={sub.outletId}>
                                                <td>
                                                    <strong>{sub.outletName}</strong>
                                                    <br />
                                                    <small className="text-muted">{sub.outletSlug}</small>
                                                </td>
                                                <td>
                                                    {sub.ownerName || 'N/A'}
                                                    {sub.ownerPhone && (
                                                        <><br /><small className="text-muted">{sub.ownerPhone}</small></>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${sub.tier === 'PRO' ? 'badge-primary' : 'badge-secondary'}`}>
                                                        {sub.tier || 'FREE'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {sub.expiresAt
                                                        ? new Date(sub.expiresAt).toLocaleDateString('id-ID')
                                                        : 'Never'}
                                                </td>
                                                <td>
                                                    {sub.daysRemaining !== null ? (
                                                        <span
                                                            className={
                                                                sub.daysRemaining <= 7 && sub.daysRemaining > 0
                                                                    ? 'text-danger font-weight-bold'
                                                                    : ''
                                                            }
                                                        >
                                                            {sub.daysRemaining} days
                                                        </span>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </td>
                                                <td>
                                                    {sub.isExpired ? (
                                                        <span className="badge badge-danger">Expired</span>
                                                    ) : sub.expiresAt ? (
                                                        <span className="badge badge-success">Active</span>
                                                    ) : (
                                                        <span className="badge badge-secondary">No Subscription</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
