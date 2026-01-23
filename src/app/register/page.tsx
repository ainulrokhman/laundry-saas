'use client';

/**
 * Registration Page
 * 
 * Modern multi-step registration form with SweetAlert integration
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { ApiResponse } from '@/types';

type Step = 1 | 2 | 3 | 4;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [outletName, setOutletName] = useState('');
  const [outletAddress, setOutletAddress] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetAt: string } | null>(null);

  useEffect(() => {
    // Import SweetAlert2 CSS
    import('sweetalert2/dist/sweetalert2.min.css');
  }, []);

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
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK',
    });
  };

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      showError('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'REGISTER' }),
      });

      const data: ApiResponse<{ remaining: number; resetAt: string }> = await response.json();

      if (data.success) {
        setRateLimitInfo(data.data || null);
        showSuccess('OTP code has been sent to your WhatsApp');
        setStep(2);
      } else {
        showError(data.error || 'Failed to send OTP');
        if (data.data) {
          setRateLimitInfo(data.data);
        }
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showError('Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, type: 'REGISTER' }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        showSuccess('OTP verified successfully');
        setStep(3);
      } else {
        showError(data.error || 'Invalid OTP code');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Registration
  const handleRegister = async () => {
    // Validation
    if (!name || name.length < 2) {
      showError('Name must be at least 2 characters');
      return;
    }
    if (!outletName || outletName.length < 2) {
      showError('Outlet name must be at least 2 characters');
      return;
    }
    if (!outletAddress || outletAddress.length < 5) {
      showError('Outlet address must be at least 5 characters');
      return;
    }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      showError('PIN must be 4-6 digits');
      return;
    }
    if (pin !== confirmPin) {
      showError('PIN and confirmation PIN do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otpCode,
          name,
          outletName,
          outletAddress,
          pin,
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'Your account has been created. Redirecting to login...',
          showConfirmButton: false,
          timer: 2000,
        }).then(() => {
          router.push('/login');
        });
      } else {
        showError(data.error || 'Registration failed');
      }
    } catch (err) {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Enter Phone Number';
      case 2:
        return 'Verify OTP';
      case 3:
        return 'Complete Registration';
      default:
        return 'Registration';
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary mb-1">
                    <i className="fas fa-user-plus me-2"></i>
                    Create Account
                  </h2>
                  <p className="text-muted small">{getStepTitle()}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`step-indicator ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}
                      >
                        <div className="step-circle">
                          {step > s ? <i className="fas fa-check"></i> : s}
                        </div>
                        <div className="step-label small mt-1">
                          {s === 1 ? 'Phone' : s === 2 ? 'OTP' : 'Details'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="progress" style={{ height: '4px' }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${((step - 1) / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Rate Limit Info */}
                {rateLimitInfo && rateLimitInfo.remaining < 3 && (
                  <div className="alert alert-info py-2 mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    <small>Remaining OTP requests: {rateLimitInfo.remaining}</small>
                  </div>
                )}

                {/* Step 1: Phone Number */}
                {step === 1 && (
                  <div>
                    <div className="mb-3">
                      <label htmlFor="phone" className="form-label small text-muted">
                        WhatsApp Number
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
                    <button
                      type="button"
                      className="btn btn-primary w-100 py-2 fw-semibold"
                      onClick={handleRequestOtp}
                      disabled={loading || !phone}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>
                          Send OTP via WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Step 2: Verify OTP */}
                {step === 2 && (
                  <div>
                    <div className="mb-3">
                      <label htmlFor="otp" className="form-label small text-muted">
                        Enter OTP Code
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fas fa-key text-muted"></i>
                        </span>
                        <input
                          type="text"
                          id="otp"
                          className="form-control border-start-0 ps-0 text-center fw-bold"
                          placeholder="000000"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          maxLength={6}
                          required
                        />
                      </div>
                      <small className="text-muted">Check your WhatsApp for the 6-digit code</small>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill py-2"
                        onClick={() => {
                          setStep(1);
                          setOtpCode('');
                        }}
                        disabled={loading}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary flex-fill py-2 fw-semibold"
                        onClick={handleVerifyOtp}
                        disabled={loading || otpCode.length !== 6}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify <i className="fas fa-arrow-right ms-2"></i>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-center mt-3">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRequestOtp();
                        }}
                        className="text-primary small text-decoration-none"
                      >
                        Resend OTP
                      </a>
                    </div>
                  </div>
                )}

                {/* Step 3: Complete Registration */}
                {step === 3 && (
                  <div>
                    <h6 className="mb-3 text-muted">
                      <i className="fas fa-user me-2"></i>Personal Information
                    </h6>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label small text-muted">
                        Your Name
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fas fa-user text-muted"></i>
                        </span>
                        <input
                          type="text"
                          id="name"
                          className="form-control border-start-0 ps-0"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    <h6 className="mb-3 mt-4 text-muted">
                      <i className="fas fa-store me-2"></i>Outlet Information
                    </h6>
                    <div className="mb-3">
                      <label htmlFor="outletName" className="form-label small text-muted">
                        Outlet Name
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fas fa-store text-muted"></i>
                        </span>
                        <input
                          type="text"
                          id="outletName"
                          className="form-control border-start-0 ps-0"
                          placeholder="My Laundry Shop"
                          value={outletName}
                          onChange={(e) => setOutletName(e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="outletAddress" className="form-label small text-muted">
                        Outlet Address
                      </label>
                      <textarea
                        id="outletAddress"
                        className="form-control"
                        placeholder="Enter complete address"
                        value={outletAddress}
                        onChange={(e) => setOutletAddress(e.target.value)}
                        disabled={loading}
                        rows={3}
                        required
                      ></textarea>
                    </div>

                    <h6 className="mb-3 mt-4 text-muted">
                      <i className="fas fa-lock me-2"></i>Set PIN
                    </h6>
                    <div className="mb-3">
                      <label htmlFor="pin" className="form-label small text-muted">
                        PIN (4-6 digits)
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fas fa-lock text-muted"></i>
                        </span>
                        <input
                          type="password"
                          id="pin"
                          className="form-control border-start-0 ps-0"
                          placeholder="Enter PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label htmlFor="confirmPin" className="form-label small text-muted">
                        Confirm PIN
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="fas fa-lock text-muted"></i>
                        </span>
                        <input
                          type="password"
                          id="confirmPin"
                          className="form-control border-start-0 ps-0"
                          placeholder="Confirm PIN"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          disabled={loading}
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill py-2"
                        onClick={() => setStep(2)}
                        disabled={loading}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Back
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary flex-fill py-2 fw-semibold"
                        onClick={handleRegister}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Registering...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check me-2"></i>
                            Register
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Login Link */}
                <div className="text-center mt-4">
                  <p className="mb-0 small text-muted">
                    Already have an account?{' '}
                    <a href="/login" className="text-primary text-decoration-none fw-semibold">
                      Login here
                    </a>
                  </p>
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
        .step-indicator {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        .step-indicator:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 15px;
          left: 60%;
          width: 80%;
          height: 2px;
          background: #dee2e6;
          z-index: 0;
        }
        .step-indicator.active:not(:last-child)::after,
        .step-indicator.completed:not(:last-child)::after {
          background: #667eea;
        }
        .step-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #dee2e6;
          color: #6c757d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          position: relative;
          z-index: 1;
        }
        .step-indicator.active .step-circle {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .step-indicator.completed .step-circle {
          background: #28a745;
          color: white;
        }
        .step-label {
          color: #6c757d;
        }
        .step-indicator.active .step-label {
          color: #667eea;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
