'use client';

/**
 * Login Page
 * 
 * Modern PIN-based login page with SweetAlert integration
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
// Import SweetAlert2 CSS
import 'sweetalert2/dist/sweetalert2.min.css';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // SweetAlert2 CSS is imported statically at the top of the file

  const showError = (message: string) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK',
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!phone || phone.length < 10) {
      showError('Masukkan nomor telepon yang valid');
      return;
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      showError('PIN harus 4-6 digit');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        phone: phone.replace(/\D/g, ''),
        pin: pin,
        redirect: false,
      });

      if (result?.error) {
        showError('Nomor telepon atau PIN salah. Silakan coba lagi.');
      } else if (result?.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Login berhasil. Mengalihkan...',
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          router.push('/dashboard');
          router.refresh();
        });
      }
    } catch (err) {
      showError('Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                {/* Logo */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary mb-1">
                    <i className="fas fa-tshirt me-2"></i>
                    Ainul Laundry
                  </h2>
                  <p className="text-muted small">Masuk ke akun Anda</p>
                </div>

                <form onSubmit={handleLogin}>
                  {/* Phone Number */}
                  <div className="mb-3">
                    <label htmlFor="phone" className="form-label small text-muted">
                      Nomor Telepon
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-phone text-muted"></i>
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        className="form-control border-start-0 ps-0"
                        placeholder="081234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {/* PIN */}
                  <div className="mb-4">
                    <label htmlFor="pin" className="form-label small text-muted">
                      PIN
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type="password"
                        id="pin"
                        className="form-control border-start-0 ps-0"
                        placeholder="Masukkan PIN Anda"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={loading}
                        maxLength={6}
                        required
                      />
                    </div>
                    <small className="text-muted">4-6 digit</small>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-semibold"
                    disabled={loading || !phone || !pin}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Masuk...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Masuk
                      </>
                    )}
                  </button>
                </form>

                {/* Register Link */}
                <div className="text-center mt-4">
                  <p className="mb-0 small text-muted">
                    Belum punya akun?{' '}
                    <a href="/register" className="text-primary text-decoration-none fw-semibold">
                      Daftar di sini
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .hold-transition {
          display: none;
        }
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
          border-radius: 15px;
          overflow: hidden;
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
