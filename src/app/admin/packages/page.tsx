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
    maxOutlets: number;
    isActive: boolean;
    sortOrder: number;
    subscriberCount: number;
    isDefault: boolean;
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState<Package | null>(null);
    const [formData, setFormData] = useState<Partial<Package>>({
        name: '',
        slug: '',
        price: 0,
        description: '',
        features: [],
        maxStaff: 3,
        maxOutlets: 1,
        sortOrder: 0,
        isActive: true,
        isDefault: false,
    });
    const [formSaving, setFormSaving] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, [showInactive]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/packages?includeInactive=${showInactive}`);
            if (!res.ok) throw new Error('Failed to fetch packages');
            const data = await res.json();
            setPackages(data);
        } catch (error) {
            console.error('Error fetching packages:', error);
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingPackage(null);
        setFormData({
            name: '',
            slug: '',
            price: 0,
            description: '',
            features: [],
            maxStaff: 3,
            maxOutlets: 1,
            sortOrder: 0,
            isActive: true,
            isDefault: false,
        });
        setShowModal(true);
    };

    const handleOpenEdit = (pkg: Package) => {
        setEditingPackage(pkg);
        setFormData({
            name: pkg.name,
            slug: pkg.slug,
            price: pkg.price,
            description: pkg.description || '',
            features: pkg.features,
            maxStaff: pkg.maxStaff,
            maxOutlets: pkg.maxOutlets,
            sortOrder: pkg.sortOrder,
            isActive: pkg.isActive,
            isDefault: pkg.isDefault,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSaving(true);

        try {
            const url = editingPackage
                ? `/api/admin/packages/${editingPackage.id}`
                : '/api/admin/packages';
            const method = editingPackage ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || json.message || 'Failed to save package');
            }

            alert(`Package ${editingPackage ? 'updated' : 'created'} successfully!`);
            setShowModal(false);
            fetchPackages();
        } catch (error: any) {
            console.error('Save error:', error);
            alert(error.message);
        } finally {
            setFormSaving(false);
        }
    };

    const handleFeatureToggle = (feature: PackageFeature) => {
        const currentFeatures = formData.features || [];
        if (currentFeatures.includes(feature)) {
            setFormData({ ...formData, features: currentFeatures.filter(f => f !== feature) });
        } else {
            setFormData({ ...formData, features: [...currentFeatures, feature] });
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

    const handleSetDefault = async (pkg: Package) => {
        if (!confirm(`Set "${pkg.name}" as the default package for new registrations?`)) return;

        try {
            const res = await fetch(`/api/admin/packages/${pkg.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true }),
            });

            if (res.ok) {
                alert(`"${pkg.name}" is now the default package.`);
                fetchPackages();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to set default package');
            }
        } catch (error) {
            console.error('Error setting default package:', error);
            alert('An error occurred');
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
                        <div className="col-md-12 d-flex justify-content-between">
                            <div className="btn-group">
                                <button className="btn btn-primary" onClick={initializePackages}>
                                    <i className="fas fa-magic mr-2"></i>
                                    Init Defaults
                                </button>
                                <button
                                    className={`btn ${showInactive ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => setShowInactive(!showInactive)}
                                >
                                    <i className="fas fa-eye mr-2"></i>
                                    {showInactive ? 'Hide' : 'Show'} Inactive
                                </button>
                            </div>

                            <button className="btn btn-success" onClick={handleOpenCreate}>
                                <i className="fas fa-plus mr-2"></i>
                                Add Package
                            </button>
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
                                <div key={pkg.id} className="col-md-4 mb-4">
                                    <div className={`card ${!pkg.isActive ? 'bg-light' : ''} ${pkg.isDefault ? 'border-primary shadow-sm' : ''} h-100`}>
                                        <div className={`card-header ${pkg.isDefault ? 'bg-primary text-white' : ''}`}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <h3 className="card-title font-weight-bold">{pkg.name}</h3>
                                                {pkg.isDefault && (
                                                    <span className="badge badge-light text-primary"><i className="fas fa-star mr-1"></i>Default</span>
                                                )}
                                            </div>
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
                                                <h2 className={`font-weight-bold mb-0 ${pkg.isDefault ? 'text-primary' : 'text-primary'}`}>
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

                                            <div className="d-flex justify-content-between mb-2 border-bottom pb-2">
                                                <strong>Max Outlets:</strong>
                                                <span>
                                                    {pkg.maxOutlets === -1 ? '∞ Unlimited' : pkg.maxOutlets}
                                                </span>
                                            </div>

                                            <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                                                <strong>Subscribers:</strong>
                                                <span>{pkg.subscriberCount}</span>
                                            </div>

                                            <p className="mb-2"><strong>Features:</strong></p>
                                            <ul className="list-unstyled fa-ul mb-0">
                                                {pkg.features.map((feature) => (
                                                    <li key={feature} className="mb-1">
                                                        <span className="fa-li"><i className="fas fa-check text-success"></i></span>
                                                        <small>{FEATURE_LABELS[feature]}</small>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="card-footer bg-transparent">
                                            <div className="d-grid gap-2">
                                                <button
                                                    className="btn btn-outline-primary"
                                                    onClick={() => handleOpenEdit(pkg)}
                                                >
                                                    <i className="fas fa-edit mr-1"></i> Edit
                                                </button>
                                                <div className="btn-group">
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
                                                        disabled={pkg.subscriberCount > 0 || pkg.isDefault}
                                                    >
                                                        <i className="fas fa-trash mr-1"></i>
                                                        Delete
                                                    </button>
                                                </div>
                                                {!pkg.isDefault && pkg.isActive && (
                                                    <button
                                                        className="btn btn-outline-warning mt-2"
                                                        onClick={() => handleSetDefault(pkg)}
                                                    >
                                                        <i className="fas fa-star mr-1"></i> Set as Default
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <>
                    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{editingPackage ? 'Edit Package' : 'Create Package'}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <div className="form-check form-switch bg-light p-2 rounded">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="isDefault"
                                                        checked={formData.isDefault}
                                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                                    />
                                                    <label className="form-check-label fw-bold" htmlFor="isDefault">
                                                        Set as Default Package for New Registrations
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Package Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Slug (Unique ID)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    required
                                                    value={formData.slug}
                                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                                    placeholder="basic-plan (lowercase, no spaces)"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Price (IDR)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    required
                                                    min="0"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Max Staff (-1 for Unlimited)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    required
                                                    value={formData.maxStaff}
                                                    onChange={(e) => setFormData({ ...formData, maxStaff: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Max Outlets (-1 for Unlimited)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    required
                                                    value={formData.maxOutlets}
                                                    onChange={(e) => setFormData({ ...formData, maxOutlets: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Sort Order</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={formData.sortOrder}
                                                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label">Description</label>
                                                <textarea
                                                    className="form-control"
                                                    rows={2}
                                                    value={formData.description || ''}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                ></textarea>
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label d-block">Features</label>
                                                <div className="row">
                                                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                                                        <div key={key} className="col-md-6">
                                                            <div className="form-check">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    id={`feature-${key}`}
                                                                    checked={formData.features?.includes(key as PackageFeature)}
                                                                    onChange={() => handleFeatureToggle(key as PackageFeature)}
                                                                />
                                                                <label className="form-check-label" htmlFor={`feature-${key}`}>
                                                                    {label}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={formSaving}>
                                            {formSaving ? 'Saving...' : 'Save Package'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
