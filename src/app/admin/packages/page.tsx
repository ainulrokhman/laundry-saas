/**
 * Package Management Page (SUPERADMIN)
 * 
 * Manage subscription packages - CRUD operations
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PackageFeature, FEATURE_LABELS } from '@/constants/packageFeatures';

interface Package {
    id: string;
    name: string;
    slug: string;
    price: number;
    description: string | null;
    features: PackageFeature[];
    maxStaff: number;
    isActive: boolean;
    sortOrder: number;
    subscriberCount: number;
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, [showInactive]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/packages?includeInactive=${showInactive}`);

            if (!res.ok) {
                // Try to parse error message if possible, otherwise use status text
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.error || json.message || `Error ${res.status}: ${res.statusText}`);
                } catch (e) {
                    throw new Error(`Error ${res.status}: ${res.statusText}`);
                }
            }

            const data = await res.json();
            setPackages(data);
        } catch (error) {
            console.error('Error fetching packages:', error);
            // Optionally set empty packages or show error state
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const initializePackages = async () => {
        if (!confirm('Initialize default packages (Bersih, Wangi, Licin)?')) return;

        try {
            const res = await fetch('/api/admin/packages/initialize', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                fetchPackages();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error initializing packages:', error);
            alert('Failed to initialize packages');
        }
    };

    const togglePackageStatus = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/packages/${id}/toggle`, { method: 'PATCH' });
            if (res.ok) {
                fetchPackages();
            }
        } catch (error) {
            console.error('Error toggling package status:', error);
        }
    };

    const deletePackage = async (id: string, name: string) => {
        if (!confirm(`Delete package "${name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                alert('Package deleted successfully');
                fetchPackages();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error deleting package:', error);
            alert('Failed to delete package');
        }
    };

    return (
        <div className="content-wrapper">
            {/* Content Header */}
            <div className="content-header pt-3">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Package Management</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-end">
                                <li className="breadcrumb-item">
                                    <Link href="/dashboard">Admin</Link>
                                </li>
                                <li className="breadcrumb-item active">Packages</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="content">
                <div className="container-fluid">
                    <div className="row mb-3">
                        <div className="col-md-12">
                            <div className="btn-group">
                                <button className="btn btn-primary" onClick={initializePackages}>
                                    <i className="fas fa-magic mr-2"></i>
                                    Initialize Default Packages
                                </button>
                                <button
                                    className={`btn ${showInactive ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => setShowInactive(!showInactive)}
                                >
                                    <i className="fas fa-eye mr-2"></i>
                                    {showInactive ? 'Hide' : 'Show'} Inactive
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
                            <p className="text-muted mt-2">Loading packages...</p>
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="alert alert-info">
                            <i className="fas fa-info-circle mr-2"></i>
                            No packages found. Click "Initialize Default Packages" to create default packages.
                        </div>
                    ) : (
                        <div className="row">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="col-md-4">
                                    <div className={`card ${!pkg.isActive ? 'bg-light' : ''} h-100`}>
                                        <div className="card-header">
                                            <h3 className="card-title font-weight-bold">{pkg.name}</h3>
                                            <div className="card-tools">
                                                {pkg.isActive ? (
                                                    <span className="badge badge-success">Active</span>
                                                ) : (
                                                    <span className="badge badge-secondary">Inactive</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="card-body">
                                            <div className="text-center mb-4">
                                                <h2 className="text-primary font-weight-bold mb-0">
                                                    Rp {pkg.price.toLocaleString('id-ID')}
                                                </h2>
                                                <small className="text-muted">/bulan</small>
                                                {pkg.description && (
                                                    <p className="text-muted mt-2 mb-0">{pkg.description}</p>
                                                )}
                                            </div>

                                            <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                                <strong>Max Staff:</strong>
                                                <span>
                                                    {pkg.maxStaff === -1 ? '∞ Unlimited' : pkg.maxStaff}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                                                <strong>Subscribers:</strong>
                                                <span>{pkg.subscriberCount}</span>
                                            </div>

                                            <p className="mb-2"><strong>Features:</strong></p>
                                            <ul className="list-unstyled fa-ul">
                                                {pkg.features.map((feature) => (
                                                    <li key={feature} className="mb-2">
                                                        <span className="fa-li"><i className="fas fa-check text-success"></i></span>
                                                        <small>{FEATURE_LABELS[feature]}</small>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="card-footer bg-transparent">
                                            <div className="btn-group btn-block w-100">
                                                <button
                                                    className={`btn ${pkg.isActive ? 'btn-warning' : 'btn-success'}`}
                                                    onClick={() => togglePackageStatus(pkg.id)}
                                                >
                                                    <i className={`fas fa-${pkg.isActive ? 'pause' : 'play'} mr-1`}></i>
                                                    {pkg.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => deletePackage(pkg.id, pkg.name)}
                                                    disabled={pkg.subscriberCount > 0}
                                                >
                                                    <i className="fas fa-trash mr-1"></i>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
