
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { formatDateTime } from '@/lib/utils'; // Assuming this utility exists

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
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const router = useRouter();

    const user = session?.user as any;
    const role = user?.role as string | undefined;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            if (role !== 'OWNER' && role !== 'STAFF') {
                router.push('/dashboard');
            } else if (!user?.outletId) {
                setError('Outlet context required.');
                setLoading(false);
            }
        }
    }, [status, router, role, user?.outletId]);

    const canFetch = status === 'authenticated' && (role === 'OWNER' || role === 'STAFF') && !!user?.outletId && !!id;

    useEffect(() => {
        if (!canFetch) return;
        async function fetchCustomer() {
            try {
                setLoading(true);
                const res = await fetch(`/api/dashboard/customers/${id}`);
                const json = await res.json().catch(() => null);

                if (!res.ok || !json?.success) {
                    // If 404, redirect or show error
                    if (res.status === 404) {
                        setError('Pelanggan tidak ditemukan');
                    } else {
                        throw new Error(json?.message || json?.error || 'Gagal memuat detail pelanggan');
                    }
                    return;
                }

                setCustomer(json.data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal memuat detail pelanggan');
            } finally {
                setLoading(false);
            }
        }
        fetchCustomer();
    }, [canFetch, id]);

    if (loading) {
        return (
            <div className="content-wrapper">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
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
                        {error || 'Data pelanggan tidak ditemukan'}
                    </div>
                    <Link href="/dashboard/customers" className="btn btn-secondary">
                        <i className="fas fa-arrow-left me-1"></i> Kembali ke Daftar
                    </Link>
                </div>
            </div>
        );
    }

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
                                <li className="breadcrumb-item"><Link href="/dashboard">Dashboard</Link></li>
                                <li className="breadcrumb-item"><Link href="/dashboard/customers">Pelanggan</Link></li>
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
                                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <h3 className="profile-username text-center">{customer.name}</h3>
                                    <p className="text-muted text-center mb-1">{customer.phone || 'No Phone'}</p>
                                    <p className="text-muted text-center small"><i className="fas fa-map-marker-alt me-1"></i> {customer.address || 'Belum ada alamat'}</p>

                                    <div className="d-grid gap-2 mt-4">
                                        <button className="btn btn-outline-primary btn-sm disabled">
                                            <i className="fas fa-history me-1"></i> Riwayat Order ({customer._count?.orders ?? 0})
                                        </button>
                                        <Link href="/dashboard/customers" className="btn btn-outline-secondary btn-sm">
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
                                    <strong><i className="fas fa-envelope mr-1"></i> Email</strong>
                                    <p className="text-muted">{customer.email || '-'}</p>
                                    <hr />
                                    <strong><i className="far fa-calendar-alt mr-1"></i> Terdaftar</strong>
                                    <p className="text-muted">{formatDateTime(customer.createdAt)}</p>
                                    <hr />
                                    <strong><i className="far fa-clock mr-1"></i> Terakhir Update</strong>
                                    <p className="text-muted">{formatDateTime(customer.updatedAt)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-8">
                            {/* Order History Placeholder */}
                            <div className="card shadow-sm h-100">
                                <div className="card-header p-2">
                                    <h3 className="card-title p-2">Riwayat Transaksi</h3>
                                </div>
                                <div className="card-body">
                                    <div className="alert alert-info">
                                        <i className="fas fa-info-circle me-1"></i> Fitur riwayat transaksi per pelanggan akan segera hadir.
                                    </div>
                                    <div className="text-center py-5 opacity-50">
                                        <i className="fas fa-receipt fa-4x mb-3"></i>
                                        <p>Data transaksi akan muncul di sini</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
