'use client';

import React, { useEffect, useState } from 'react';
import ContentHeader from '@/components/adminlte/ContentHeader';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface SubscriptionData {
    packageName: string;
    packageDescription: string;
    price: number;
    maxOutlets: number;
    usedOutlets: number;
    expiresAt: string | null;
    startedAt: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
}

interface PaymentHistory {
    id: string;
    createdAt: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    package?: {
        name: string;
    };
}

export default function SubscriptionPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        fetchSubscription();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/dashboard/subscription/history');
            const json = await res.json();
            if (json.success) {
                setHistory(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchSubscription = async () => {
        try {
            const res = await fetch('/api/dashboard/subscription');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch subscription', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateProgress = () => {
        if (!data) return 0;
        if (data.maxOutlets === 0) return 100; // Prevent division by zero
        const pct = (data.usedOutlets / data.maxOutlets) * 100;
        return Math.min(pct, 100);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="content-wrapper">
                <ContentHeader title="Paket Langganan" />
                <div className="content">
                    <div className="container-fluid">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const progress = calculateProgress();
    const isExpired = data?.status === 'EXPIRED';

    return (
        <div className="content-wrapper">
            <ContentHeader title="Paket Langganan" />

            <div className="content">
                <div className="container-fluid">

                    <div className="row">
                        {/* Package Info Card */}
                        <div className="col-md-6">
                            <div className={`card ${isExpired ? 'card-danger' : 'card-primary'} card-outline`}>
                                <div className="card-body box-profile">
                                    <div className="text-center">
                                        <span className="fas fa-gem fa-3x text-primary mb-3"></span>
                                    </div>
                                    <h3 className="profile-username text-center">{data?.packageName}</h3>
                                    <p className="text-muted text-center">{data?.packageDescription}</p>

                                    <ul className="list-group list-group-unbordered mb-3">
                                        <li className="list-group-item">
                                            <b>Status</b>
                                            <span className={`float-end badge ${isExpired ? 'bg-danger' : 'bg-success'}`}>
                                                {data?.status}
                                            </span>
                                        </li>
                                        <li className="list-group-item">
                                            <b>Harga</b> <span className="float-end">{formatCurrency(data?.price || 0)} / bulan</span>
                                        </li>
                                        <li className="list-group-item">
                                            <b>Berlaku Sampai</b> <span className="float-end">{formatDate(data?.expiresAt ?? null)}</span>
                                        </li>
                                    </ul>

                                    <Link
                                        href="/dashboard/settings/subscription/upgrade"
                                        className="btn btn-primary btn-block w-100"
                                    >
                                        <i className="fas fa-arrow-up me-2"></i> Upgrade Paket
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Usage Stats Card */}
                        <div className="col-md-6">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Penggunaan Kuota</h3>
                                </div>
                                <div className="card-body">
                                    <h5>Outlet</h5>
                                    <p className="text-muted">
                                        Anda menggunakan <b>{data?.usedOutlets}</b> dari <b>{data?.maxOutlets}</b> slot outlet.
                                    </p>
                                    <div className="progress mb-3" style={{ height: '20px' }}>
                                        <div
                                            className={`progress-bar ${progress >= 100 ? 'bg-danger' : 'bg-primary'}`}
                                            role="progressbar"
                                            style={{ width: `${progress}%` }}
                                            aria-valuenow={progress}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        >
                                            {Math.round(progress)}%
                                        </div>
                                    </div>

                                    <div className="alert alert-info mt-4">
                                        <i className="icon fas fa-info-circle"></i>
                                        Ingin menambah cabang lebih banyak? Upgrade ke paket <b>Pro</b> atau <b>Enterprise</b> untuk kebutuhan skala besar.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment History Table */}
                    <div className="row">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Riwayat Pembayaran</h3>
                                </div>
                                <div className="card-body table-responsive p-0">
                                    <table className="table table-hover text-nowrap">
                                        <thead>
                                            <tr>
                                                <th>Tanggal</th>
                                                <th>Paket</th>
                                                <th>Jumlah</th>
                                                <th>Metode</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyLoading ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-4">Loading history...</td>
                                                </tr>
                                            ) : history.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-4 text-muted">Belum ada riwayat pembayaran</td>
                                                </tr>
                                            ) : (
                                                history.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>{formatDate(item.createdAt)}</td>
                                                        <td>{item.package?.name || '-'}</td>
                                                        <td>{formatCurrency(item.amount)}</td>
                                                        <td>{item.paymentMethod || 'Manual Transfer'}</td>
                                                        <td>
                                                            <span className={`badge ${item.status === 'SETTLEMENT' ? 'bg-success' :
                                                                item.status === 'PENDING' ? 'bg-warning' :
                                                                    item.status === 'FAILURE' ? 'bg-danger' : 'bg-secondary'
                                                                }`}>
                                                                {item.status}
                                                            </span>
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
            </div>
        </div>
    );
}
