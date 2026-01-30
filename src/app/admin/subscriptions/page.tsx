'use client';

/**
 * Admin Subscriptions List Page (SUPERADMIN)
 * 
 * View all outlet subscriptions and their status
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SubscriptionItem {
    userId: string;
    ownerName: string;
    ownerPhone: string;
    packageName: string;
    expiresAt: string | null;
    startedAt: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    outletCount: number;
}

interface Stats {
    totalOwners: number;
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
    const [updating, setUpdating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SubscriptionItem | null>(null);
    const [packages, setPackages] = useState<any[]>([]); // Should be Package[] but using any for brevity or imported type
    const [updateForm, setUpdateForm] = useState({
        packageId: '',
        expiresAt: '',
    });

    useEffect(() => {
        fetchData();
        fetchPackages();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subsRes, statsRes] = await Promise.all([
                fetch('/api/admin/subscriptions'),
                fetch('/api/admin/subscriptions/stats'),
            ]);

            if (subsRes.ok) {
                const json = await subsRes.json();
                setSubscriptions(json.data);
            }

            if (statsRes.ok) {
                const json = await statsRes.json();
                setStats(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPackages = async () => {
        try {
            // Reusing existing API (even if intended for package management page)
            const res = await fetch('/api/admin/packages');
            if (res.ok) {
                const data = await res.json();
                setPackages(data);
            }
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        }
    };

    const handleManage = (sub: SubscriptionItem) => {
        setSelectedUser(sub);
        // Find current package ID if possible (backend currently sends name, might need ID or just select based on name match if unique, 
        // ideally backend sends packageId. For now, default invalid or match by name)
        // Since we don't have packageId in SubscriptionItem interface yet (oops), we might need to update the API or just let admin pick new one.
        // Let's assume we start empty or default to first.
        // Actually, let's update SubscriptionItem to include packageId in the service first? 
        // No, let's just let them select.

        setUpdateForm({
            packageId: '', // They must select one
            expiresAt: sub.expiresAt ? new Date(sub.expiresAt).toISOString().split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/subscriptions/${selectedUser.userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: updateForm.packageId,
                    expiresAt: updateForm.expiresAt || null,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                alert('Subscription updated successfully');
                setShowModal(false);
                fetchData();
            } else {
                alert(json.error || 'Failed to update subscription');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Failed to update subscription');
        } finally {
            setUpdating(false);
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
                                        <h3>{stats.totalOwners}</h3>
                                        <p>Total Owners</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-users"></i>
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
                            <h3 className="card-title">All Owner Subscriptions</h3>
                        </div>
                        <div className="card-body">
                            <table className="table table-bordered table-hover">
                                <thead>
                                    <tr>
                                        <th>Owner</th>
                                        <th>Package</th>
                                        <th>Outlets</th>
                                        <th>Expires At</th>
                                        <th>Days Remaining</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center">
                                                No subscriptions found
                                            </td>
                                        </tr>
                                    ) : (
                                        subscriptions.map((sub) => (
                                            <tr key={sub.userId}>
                                                <td>
                                                    <strong>{sub.ownerName || 'Unknown'}</strong>
                                                    <br />
                                                    <small className="text-muted">{sub.ownerPhone || 'No Phone'}</small>
                                                </td>
                                                <td>
                                                    <span className="badge badge-info">
                                                        {sub.packageName || 'No Package'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {sub.outletCount} Outlet(s)
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
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleManage(sub)}
                                                    >
                                                        Manage
                                                    </button>
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

            {/* Manage Modal */}
            {showModal && selectedUser && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Manage Subscription</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <p>Owner: <strong>{selectedUser.ownerName}</strong></p>

                                    <div className="mb-3">
                                        <label className="form-label">Subscription Package</label>
                                        <select
                                            className="form-control"
                                            required
                                            value={updateForm.packageId}
                                            onChange={(e) => setUpdateForm({ ...updateForm, packageId: e.target.value })}
                                        >
                                            <option value="">Select Package</option>
                                            {packages.map(pkg => (
                                                <option key={pkg.id} value={pkg.id}>
                                                    {pkg.name} ({pkg.price.toLocaleString('id-ID')}/mo)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Expiry Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={updateForm.expiresAt}
                                            onChange={(e) => setUpdateForm({ ...updateForm, expiresAt: e.target.value })}
                                        />
                                        <small className="text-muted">Leave empty for no expiry (or manual control logic)</small>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={updating}>
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
