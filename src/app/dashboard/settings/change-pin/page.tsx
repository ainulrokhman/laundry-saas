'use client';

/**
 * Change PIN Page
 * 
 * Page for users to change their PIN with old PIN verification
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';
// Import SweetAlert2 CSS
import 'sweetalert2/dist/sweetalert2.min.css';

export default function ChangePinPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const showError = (message: string) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK',
    });
  };

  const showSuccess = (message: string) => {
    return Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: message,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK',
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
      // PINs are already filtered to digits only by input onChange handler
      // Just ensure they're trimmed
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

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData: ApiResponse = await response.json();
          showError(errorData.error || errorData.message || 'Gagal mengubah PIN');
        } catch {
          showError(`Gagal mengubah PIN. Status: ${response.status}`);
        }
        return;
      }

      // Parse JSON response
      let data: ApiResponse;
      try {
        data = await response.json();
        console.log('API Response:', data); // Debug log - remove in production
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        showError('Gagal memproses respons dari server.');
        return;
      }

      // Check if response indicates success
      // Explicitly check for true (not just truthy)
      if (data && data.success === true) {
        showSuccess(data.message || 'PIN berhasil diubah').then(() => {
          // Clear form
          setOldPin('');
          setNewPin('');
          setConfirmPin('');
          // Optionally redirect to dashboard
          // router.push('/dashboard');
        });
      } else {
        // Response indicates failure
        console.error('API returned failure:', data); // Debug log - remove in production
        showError(data?.error || data?.message || 'Gagal mengubah PIN');
      }
    } catch (err) {
      console.error('Change PIN error:', err);
      showError('Gagal mengubah PIN. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">
                  <i className="fas fa-lock me-2"></i>
                  Ubah PIN
                </h4>
              </div>
              <div className="card-body p-4">
                <p className="text-muted small mb-4">
                  Masukkan PIN lama dan PIN baru Anda. PIN harus terdiri dari 4-6 digit.
                </p>

                <form onSubmit={handleChangePin}>
                  {/* Old PIN */}
                  <div className="mb-3">
                    <label htmlFor="oldPin" className="form-label small text-muted fw-semibold">
                      PIN Lama
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-key text-muted"></i>
                      </span>
                      <input
                        type="password"
                        id="oldPin"
                        className="form-control border-start-0 ps-0"
                        placeholder="Masukkan PIN lama"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        maxLength={6}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  {/* New PIN */}
                  <div className="mb-3">
                    <label htmlFor="newPin" className="form-label small text-muted fw-semibold">
                      PIN Baru
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type="password"
                        id="newPin"
                        className="form-control border-start-0 ps-0"
                        placeholder="Masukkan PIN baru"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        maxLength={6}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <small className="text-muted">4-6 digit</small>
                  </div>

                  {/* Confirm PIN */}
                  <div className="mb-4">
                    <label htmlFor="confirmPin" className="form-label small text-muted fw-semibold">
                      Konfirmasi PIN Baru
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-check-circle text-muted"></i>
                      </span>
                      <input
                        type="password"
                        id="confirmPin"
                        className="form-control border-start-0 ps-0"
                        placeholder="Konfirmasi PIN baru"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        maxLength={6}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    {confirmPin && newPin !== confirmPin && (
                      <small className="text-danger">PIN tidak cocok</small>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary py-2 fw-semibold"
                      disabled={loading || !oldPin || !newPin || !confirmPin || newPin !== confirmPin}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Mengubah PIN...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Ubah PIN
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary py-2"
                      onClick={() => router.back()}
                      disabled={loading}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Kembali
                    </button>
                  </div>
                </form>

                {/* Security Notice */}
                <div className="alert alert-info mt-4 mb-0 small" role="alert">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Tips Keamanan:</strong> Gunakan PIN yang mudah diingat namun sulit ditebak. Jangan bagikan PIN Anda kepada siapapun.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
          border-radius: 15px;
          overflow: hidden;
        }
        .card-header {
          border-radius: 0;
        }
        .input-group-text {
          border-color: #dee2e6;
        }
        .form-control:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          transition: transform 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
