'use client';

/**
 * Admin Pending Payments Page (SUPERADMIN)
 * 
 * Review and approve/reject subscription payment proofs
 */

import { useState, useEffect } from 'react';

interface PendingPayment {
    id: string;
    outletId: string;
    outletName: string;
    amount: number;
    proofUrl: string | null;
    createdAt: string;
    bankAccount: {
        bankName: string;
        accountNumber: string;
    } | null;
}

export default function PendingPaymentsPage() {
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [durationDays, setDurationDays] = useState('30');
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/subscriptions/pending');
            if (res.ok) {
                const data = await res.json();
                setPayments(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedPayment) return;

        try {
            setProcessing(true);
            const res = await fetch('/api/admin/subscriptions/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: selectedPayment.id,
                    durationDays: parseInt(durationDays),
                }),
            });

            if (res.ok) {
                alert('Payment approved successfully!');
                setShowApproveModal(false);
                setSelectedPayment(null);
                fetchPayments();
            } else {
                const error = await res.json();
                alert(`Failed: ${error.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedPayment || !rejectReason) return;

        try {
            setProcessing(true);
            const res = await fetch('/api/admin/subscriptions/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: selectedPayment.id,
                    reason: rejectReason,
                }),
            });

            if (res.ok) {
                alert('Payment rejected');
                setShowRejectModal(false);
                setSelectedPayment(null);
                setRejectReason('');
                fetchPayments();
            } else {
                const error = await res.json();
                alert(`Failed: ${error.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="content-wrapper">
                <div className="content-header">
                    <h1>Pending Payments</h1>
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
                    <h1 className="m-0">Pending Subscription Payments</h1>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Payment Verification Queue</h3>
                        </div>
                        <div className="card-body">
                            {payments.length === 0 ? (
                                <p className="text-center">No pending payments</p>
                            ) : (
                                <table className="table table-bordered table-hover">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Outlet</th>
                                            <th>Amount</th>
                                            <th>Bank</th>
                                            <th>Proof</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>
                                                    {new Date(payment.createdAt).toLocaleDateString('id-ID')}
                                                </td>
                                                <td>{payment.outletName}</td>
                                                <td>Rp {payment.amount.toLocaleString('id-ID')}</td>
                                                <td>
                                                    {payment.bankAccount
                                                        ? `${payment.bankAccount.bankName}`
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
                                                            View Proof
                                                        </a>
                                                    ) : (
                                                        'No proof'
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-success btn-sm mr-2"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setShowApproveModal(true);
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setShowRejectModal(true);
                                                        }}
                                                    >
                                                        Reject
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Approve Modal */}
            {showApproveModal && selectedPayment && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Approve Payment</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setShowApproveModal(false)}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    <strong>Outlet:</strong> {selectedPayment.outletName}
                                </p>
                                <p>
                                    <strong>Amount:</strong> Rp {selectedPayment.amount.toLocaleString('id-ID')}
                                </p>
                                <div className="form-group">
                                    <label>Duration (days)</label>
                                    <select
                                        className="form-control"
                                        value={durationDays}
                                        onChange={(e) => setDurationDays(e.target.value)}
                                    >
                                        <option value="30">30 days (1 month)</option>
                                        <option value="90">90 days (3 months)</option>
                                        <option value="180">180 days (6 months)</option>
                                        <option value="365">365 days (1 year)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowApproveModal(false)}
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleApprove}
                                    disabled={processing}
                                >
                                    {processing ? 'Processing...' : 'Approve & Extend'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedPayment && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reject Payment</h5>
                                <button
                                    type="button"
                                    className="close"
                                    onClick={() => setShowRejectModal(false)}
                                >
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    <strong>Outlet:</strong> {selectedPayment.outletName}
                                </p>
                                <div className="form-group">
                                    <label>Reason for rejection</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Enter reason..."
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowRejectModal(false)}
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleReject}
                                    disabled={processing || !rejectReason}
                                >
                                    {processing ? 'Processing...' : 'Reject Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
