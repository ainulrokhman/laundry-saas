'use client';

/**
 * Subscription Management Page (OWNER)
 * 
 * Allows outlet owners to:
 * - View current subscription status
 * - Upload payment proof for subscription renewal
 * - View payment history
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SubscriptionStatus {
    tier: string | null;
    expiresAt: string | null;
    startedAt: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    isActive: boolean;
}

interface PaymentHistory {
    id: string;
    amount: number;
    status: string;
    proofUrl: string | null;
    createdAt: string;
    bankAccount: {
        bankName: string;
        accountNumber: string;
    } | null;
}

interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
}

export default function SubscriptionPage() {
    const router = useRouter();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [amount, setAmount] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statusRes, historyRes, banksRes] = await Promise.all([
                fetch('/api/dashboard/subscription/status'),
                fetch('/api/dashboard/subscription/history'),
                fetch('/api/dashboard/bank-accounts'), // Assuming this exists
            ]);

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setSubscription(statusData.data);
            }

            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData.data);
            }

            if (banksRes.ok) {
                const banksData = await banksRes.json();
                setBankAccounts(banksData.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile || !amount || !selectedBank) {
            alert('Please fill all fields');
            return;
        }

        try {
            setUploading(true);

            // 1. Get Cloudinary signature
            const signatureRes = await fetch('/api/dashboard/subscription/upload-signature', {
                method: 'POST',
            });

            if (!signatureRes.ok) throw new Error('Failed to get upload signature');

            const signatureData = await signatureRes.json();
            const { cloudName, apiKey, timestamp, signature, folder, publicId } = signatureData.data;

            // 2. Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', folder);
            formData.append('public_id', publicId);

            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!uploadRes.ok) throw new Error('Failed to upload image');

            const uploadData = await uploadRes.json();
            const proofUrl = uploadData.secure_url;

            // 3. Create transaction with proof
            const transactionRes = await fetch('/api/dashboard/subscription/upload-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    proofUrl,
                    bankAccountId: selectedBank,
                    description: 'Subscription payment',
                }),
            });

            if (!transactionRes.ok) throw new Error('Failed to create transaction');

            alert('Payment proof uploaded successfully! Awaiting admin verification.');

            // Reset form
            setAmount('');
            setSelectedBank('');
            setSelectedFile(null);
            setPreviewUrl(null);

            // Refresh data
            fetchData();
        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="content-wrapper">
                <div className="content-header">
                    <h1>Subscription Management</h1>
                </div>
                <section className="content">
                    <div className="text-center">Loading...</div>
                </section>
            </div>
        );
    }

    const daysRemaining = subscription?.daysRemaining ?? 0;
    const tierLabel = subscription?.tier === 'FREE' ? 'Free' : subscription?.tier || 'No subscription';

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0">Subscription Management</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {/* Subscription Status Card */}
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Current Subscription</h3>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-3">
                                            <strong>Tier:</strong>
                                            <p className="text-lg">{tierLabel}</p>
                                        </div>
                                        <div className="col-md-3">
                                            <strong>Status:</strong>
                                            <p>
                                                {subscription?.isActive ? (
                                                    <span className="badge badge-success">Active</span>
                                                ) : subscription?.isExpired ? (
                                                    <span className="badge badge-danger">Expired</span>
                                                ) : (
                                                    <span className="badge badge-secondary">No Subscription</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="col-md-3">
                                            <strong>Expires At:</strong>
                                            <p>
                                                {subscription?.expiresAt
                                                    ? new Date(subscription.expiresAt).toLocaleDateString('id-ID')
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="col-md-3">
                                            <strong>Days Remaining:</strong>
                                            <p className={daysRemaining <= 7 ? 'text-danger font-weight-bold' : ''}>
                                                {daysRemaining !== null ? `${daysRemaining} days` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upload Payment Proof */}
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Upload Payment Proof</h3>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handleSubmit}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Amount (Rp)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        placeholder="Enter payment amount"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Bank Account</label>
                                                    <select
                                                        className="form-control"
                                                        value={selectedBank}
                                                        onChange={(e) => setSelectedBank(e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Select bank account</option>
                                                        {bankAccounts.map((bank) => (
                                                            <option key={bank.id} value={bank.id}>
                                                                {bank.bankName} - {bank.accountNumber}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Payment Proof (Image/PDF)</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*,.pdf"
                                                onChange={handleFileChange}
                                                required
                                            />
                                            {previewUrl && (
                                                <div className="mt-2">
                                                    <img
                                                        src={previewUrl}
                                                        alt="Preview"
                                                        style={{ maxWidth: '300px', maxHeight: '200px' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={uploading}
                                        >
                                            {uploading ? 'Uploading...' : 'Upload Payment Proof'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment History */}
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Payment History</h3>
                                </div>
                                <div className="card-body">
                                    <table className="table table-bordered table-hover">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Bank</th>
                                                <th>Proof</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center">
                                                        No payment history
                                                    </td>
                                                </tr>
                                            ) : (
                                                history.map((payment) => (
                                                    <tr key={payment.id}>
                                                        <td>
                                                            {new Date(payment.createdAt).toLocaleDateString('id-ID')}
                                                        </td>
                                                        <td>Rp {payment.amount.toLocaleString('id-ID')}</td>
                                                        <td>
                                                            <span
                                                                className={`badge ${payment.status === 'SETTLEMENT'
                                                                        ? 'badge-success'
                                                                        : payment.status === 'PENDING'
                                                                            ? 'badge-warning'
                                                                            : 'badge-danger'
                                                                    }`}
                                                            >
                                                                {payment.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {payment.bankAccount
                                                                ? `${payment.bankAccount.bankName} - ${payment.bankAccount.accountNumber}`
                                                                : 'N/A'}
                                                        </td>
                                                        <td>
                                                            {payment.proofUrl ? (
                                                                <a
                                                                    href={payment.proofUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn-sm btn-info"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : (
                                                                'No proof'
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
                    </div>
                </div>
            </section>
        </div>
    );
}
