'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';
// Import SweetAlert2 CSS
import 'sweetalert2/dist/sweetalert2.min.css';

interface ChangePinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePinModal({ isOpen, onClose }: ChangePinModalProps) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showOldPin, setShowOldPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    // Helper to validate PIN format
    const isValidPin = (p: string) => /^\d{4,6}$/.test(p);

    const showError = (message: string) => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK',
            target: document.getElementById('change-pin-modal') || 'body', // Ensure clear overlay
        });
    };

    const showSuccess = (message: string) => {
        return Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: message,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK',
            target: document.getElementById('change-pin-modal') || 'body',
        });
    };

    const handleChangePin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!oldPin || !/^\d{4,6}$/.test(oldPin)) {
            showError('PIN lama harus 4-6 digit');
            return;
        }

        if (!newPin || !/^\d{4,6}$/.test(newPin)) {
            showError('PIN baru harus 4-6 digit');
            return;
        }

        if (oldPin === newPin) {
            showError('PIN baru harus berbeda dengan PIN lama');
            return;
        }

        if (newPin !== confirmPin) {
            showError('Konfirmasi PIN tidak cocok');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/dashboard/settings/change-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oldPin: oldPin.trim(),
                    newPin: newPin.trim(),
                }),
            });

            if (!response.ok) {
                try {
                    const errorData: ApiResponse = await response.json();
                    showError(errorData.error || errorData.message || 'Gagal mengubah PIN');
                } catch {
                    showError(`Gagal mengubah PIN. Status: ${response.status}`);
                }
                return;
            }

            let data: ApiResponse;
            try {
                data = await response.json();
            } catch (parseError) {
                showError('Gagal memproses respons dari server.');
                return;
            }

            if (data && data.success === true) {
                await showSuccess(data.message || 'PIN berhasil diubah');
                // Clear form and close modal
                setOldPin('');
                setNewPin('');
                setConfirmPin('');
                onClose();
            } else {
                showError(data?.error || data?.message || 'Gagal mengubah PIN');
            }
        } catch (err) {
            console.error('Change PIN error:', err);
            showError('Gagal mengubah PIN. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal fade show" id="change-pin-modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} aria-modal="true" role="dialog">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div className="modal-header bg-primary text-white border-0 py-3">
                            <h5 className="modal-title fw-bold">
                                <i className="fas fa-lock me-2"></i>
                                Ubah PIN
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={onClose}
                                aria-label="Close"
                            ></button>
                        </div>

                        <form onSubmit={handleChangePin}>
                            <div className="modal-body p-4">
                                <p className="text-muted small mb-4 text-center">
                                    Amankan akun Anda dengan mengganti PIN secara berkala.
                                </p>

                                {/* Old PIN */}
                                <div className="mb-3">
                                    <label htmlFor="oldPin" className="form-label text-muted fw-semibold small text-uppercase">
                                        PIN Lama
                                    </label>
                                    <div className="input-group input-group-lg">
                                        <span className="input-group-text bg-light border-end-0 text-muted">
                                            <i className="fas fa-key"></i>
                                        </span>
                                        <input
                                            type={showOldPin ? "text" : "password"}
                                            id="oldPin"
                                            className="form-control bg-light border-start-0 ps-0"
                                            placeholder="••••••"
                                            value={oldPin}
                                            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            disabled={loading}
                                            maxLength={6}
                                            required
                                            autoComplete="current-password"
                                            inputMode="numeric"
                                            style={{ letterSpacing: '0.2em', fontFamily: 'monospace' }}
                                        />
                                        <button
                                            className="btn btn-light border border-start-0"
                                            type="button"
                                            onClick={() => setShowOldPin(!showOldPin)}
                                        >
                                            <i className={`fas ${showOldPin ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                                        </button>
                                    </div>
                                </div>

                                {/* New PIN */}
                                <div className="mb-3">
                                    <label htmlFor="newPin" className="form-label text-muted fw-semibold small text-uppercase">
                                        PIN Baru
                                    </label>
                                    <div className="input-group input-group-lg">
                                        <span className="input-group-text bg-light border-end-0 text-muted">
                                            <i className="fas fa-lock"></i>
                                        </span>
                                        <input
                                            type={showNewPin ? "text" : "password"}
                                            id="newPin"
                                            className={`form-control bg-light border-start-0 ps-0 ${newPin && !isValidPin(newPin) ? 'is-invalid' : ''
                                                }`}
                                            placeholder="••••••"
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            disabled={loading}
                                            maxLength={6}
                                            required
                                            autoComplete="new-password"
                                            inputMode="numeric"
                                            style={{ letterSpacing: '0.2em', fontFamily: 'monospace' }}
                                        />
                                        <button
                                            className="btn btn-light border border-start-0"
                                            type="button"
                                            onClick={() => setShowNewPin(!showNewPin)}
                                        >
                                            <i className={`fas ${showNewPin ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                                        </button>
                                    </div>
                                    <div className="d-flex justify-content-between mt-1">
                                        <small className="text-muted">Min. 4 digit, Max. 6 digit</small>
                                        {newPin && isValidPin(newPin) && (
                                            <small className="text-success"><i className="fas fa-check-circle me-1"></i>Format Sesuai</small>
                                        )}
                                    </div>
                                </div>

                                {/* Confirm PIN */}
                                <div className="mb-3">
                                    <label htmlFor="confirmPin" className="form-label text-muted fw-semibold small text-uppercase">
                                        Konfirmasi PIN Baru
                                    </label>
                                    <div className="input-group input-group-lg">
                                        <span className="input-group-text bg-light border-end-0 text-muted">
                                            <i className="fas fa-check-circle"></i>
                                        </span>
                                        <input
                                            type={showConfirmPin ? "text" : "password"}
                                            id="confirmPin"
                                            className={`form-control bg-light border-start-0 ps-0 ${confirmPin && newPin !== confirmPin ? 'is-invalid' : ''
                                                }`}
                                            placeholder="••••••"
                                            value={confirmPin}
                                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            disabled={loading}
                                            maxLength={6}
                                            required
                                            autoComplete="new-password"
                                            inputMode="numeric"
                                            style={{ letterSpacing: '0.2em', fontFamily: 'monospace' }}
                                        />
                                        <button
                                            className="btn btn-light border border-start-0"
                                            type="button"
                                            onClick={() => setShowConfirmPin(!showConfirmPin)}
                                        >
                                            <i className={`fas ${showConfirmPin ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                                        </button>
                                    </div>
                                    {confirmPin && newPin !== confirmPin && (
                                        <div className="text-danger small mt-1 fw-bold">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            PIN tidak cocok
                                        </div>
                                    )}
                                    {confirmPin && newPin === confirmPin && (
                                        <div className="text-success small mt-1 fw-bold">
                                            <i className="fas fa-check-circle me-1"></i>
                                            PIN Cocok
                                        </div>
                                    )}
                                </div>

                                {/* Security Notice */}
                                <div className="alert alert-light bg-light border-0 rounded-3 p-3 mb-0">
                                    <div className="d-flex">
                                        <div className="flex-shrink-0">
                                            <i className="fas fa-shield-alt text-primary fa-lg mt-1"></i>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h6 className="alert-heading fw-bold mb-1 text-dark">Tips Keamanan</h6>
                                            <div className="small text-muted">
                                                Hindari angka berurutan (123456) atau tanggal lahir.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer border-top-0 d-grid gap-2 p-4 pt-0">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg shadow-sm"
                                    style={{
                                        background: 'linear-gradient(45deg, #4e73df 0%, #224abe 100%)',
                                        border: 'none'
                                    }}
                                    disabled={loading || !oldPin || !newPin || !confirmPin || newPin !== confirmPin}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            Simpan PIN Baru
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-link text-decoration-none text-muted"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <style jsx>{`
          .form-control:focus {
            box-shadow: none;
            background-color: #fff !important;
          }
          .input-group:focus-within {
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
            border-radius: 0.375rem;
          }
          .input-group:focus-within .form-control,
          .input-group:focus-within .input-group-text,
          .input-group:focus-within .btn {
            border-color: #86b7fe;
            background-color: #fff !important;
          }
        `}</style>
            </div>
        </>
    );
}
