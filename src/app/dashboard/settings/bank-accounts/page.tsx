/**
 * Bank Account Management Page
 * 
 * Displays list of bank accounts for the authenticated outlet (Owner only).
 * Includes CRUD operations with AdminLTE styling.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BankAccountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session) {
      const user = session.user as any;
      // Only OWNER can access bank account management
      if (user?.role !== 'OWNER') {
        router.push('/dashboard');
        return;
      }
      if (!user?.outletId) {
        setError('Outlet context required. Please contact administrator.');
        setLoading(false);
        return;
      }
      fetchBankAccounts();
    }
  }, [status, session, router]);

  // Initialize card collapse widgets after content loads
  useEffect(() => {
    const initCardWidgets = () => {
      const cardWidgetButtons = document.querySelectorAll('[data-card-widget="collapse"]');
      
      cardWidgetButtons.forEach((button) => {
        const buttonEl = button as HTMLElement;
        
        // Skip if already has listener
        if (buttonEl.dataset.listenerAttached === 'true') return;
        buttonEl.dataset.listenerAttached = 'true';

        // Add click handler
        buttonEl.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const card = this.closest('.card');
          if (!card) return;

          const cardBody = card.querySelector('.card-body') as HTMLElement;
          const cardFooter = card.querySelector('.card-footer') as HTMLElement;
          const icon = this.querySelector('i');

          if (cardBody) {
            const isCollapsed = cardBody.classList.contains('d-none') || 
                               getComputedStyle(cardBody).display === 'none';
            
            if (isCollapsed) {
              // Expand
              cardBody.classList.remove('d-none');
              cardBody.style.display = '';
              if (cardFooter) {
                cardFooter.classList.remove('d-none');
                cardFooter.style.display = '';
              }
              if (icon) {
                icon.classList.remove('fa-plus');
                icon.classList.add('fa-minus');
              }
            } else {
              // Collapse
              cardBody.classList.add('d-none');
              cardBody.style.display = 'none';
              if (cardFooter) {
                cardFooter.classList.add('d-none');
                cardFooter.style.display = 'none';
              }
              if (icon) {
                icon.classList.remove('fa-minus');
                icon.classList.add('fa-plus');
              }
            }
          }
        });
      });
    };

    // Initialize after DOM is ready
    const timer = setTimeout(initCardWidgets, 100);
    return () => clearTimeout(timer);
  }, [bankAccounts]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/settings/bank-accounts');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch bank accounts');
      }

      setBankAccounts(data.data);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ bankName: '', accountName: '', accountNumber: '', isActive: true });
    setFormError(null);
    setFieldErrors({});
    setEditingBankAccount(null);
    setShowCreateModal(true);
  };

  const handleEdit = (bankAccount: BankAccount) => {
    setFormData({
      bankName: bankAccount.bankName,
      accountName: bankAccount.accountName,
      accountNumber: bankAccount.accountNumber,
      isActive: bankAccount.isActive,
    });
    setFormError(null);
    setFieldErrors({});
    setEditingBankAccount(bankAccount);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const errors: { bankName?: string; accountName?: string; accountNumber?: string } = {};
    
    if (!formData.bankName.trim()) {
      errors.bankName = 'Nama bank harus diisi';
    }
    
    if (!formData.accountName.trim()) {
      errors.accountName = 'Nama pemilik rekening harus diisi';
    }
    
    if (!formData.accountNumber.trim()) {
      errors.accountNumber = 'Nomor rekening harus diisi';
    } else if (!/^[0-9]+$/.test(formData.accountNumber.trim())) {
      errors.accountNumber = 'Nomor rekening hanya boleh mengandung angka';
    }
    
    // If there are validation errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus on first error field
      const firstErrorField = Object.keys(errors)[0];
      const fieldElement = document.getElementById(firstErrorField);
      if (fieldElement) {
        fieldElement.focus();
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    
    // Clear field errors if validation passes
    setFieldErrors({});
    setFormLoading(true);
    setFormError(null);

    try {
      const url = editingBankAccount
        ? `/api/dashboard/settings/bank-accounts/${editingBankAccount.id}`
        : '/api/dashboard/settings/bank-accounts';
      const method = editingBankAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors: { bankName?: string; accountName?: string; accountNumber?: string } = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            if (err.field === 'bankName') {
              fieldErrors.bankName = err.message;
            } else if (err.field === 'accountName') {
              fieldErrors.accountName = err.message;
            } else if (err.field === 'accountNumber') {
              fieldErrors.accountNumber = err.message;
            }
          });
          
          if (Object.keys(fieldErrors).length > 0) {
            setFieldErrors(fieldErrors);
            // Focus on first error field
            const firstErrorField = Object.keys(fieldErrors)[0];
            const fieldElement = document.getElementById(firstErrorField);
            if (fieldElement) {
              fieldElement.focus();
              fieldElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
          }
        }
        
        throw new Error(data.error || data.message || 'Failed to save bank account');
      }

      // Success - close modal and refresh list
      setShowCreateModal(false);
      setEditingBankAccount(null);
      setFieldErrors({});
      await fetchBankAccounts();

      // Show success message with SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: editingBankAccount ? 'Rekening bank berhasil diperbarui' : 'Rekening bank berhasil ditambahkan',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error saving bank account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan rekening bank';
      setFormError(errorMessage);
      
      // Show error with SweetAlert
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: errorMessage,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Rekening Bank?',
      text: 'Apakah Anda yakin ingin menghapus rekening bank ini? Tindakan ini tidak dapat dibatalkan.',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/settings/bank-accounts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to delete bank account');
      }

      await fetchBankAccounts();
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Rekening bank berhasil dihapus',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error deleting bank account:', err);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Gagal menghapus rekening bank',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleToggleActive = async (bankAccount: BankAccount) => {
    try {
      const response = await fetch(`/api/dashboard/settings/bank-accounts/${bankAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to update bank account');
      }

      await fetchBankAccounts();
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Rekening bank berhasil ${bankAccount.isActive ? 'dinonaktifkan' : 'diaktifkan'}`,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error toggling bank account status:', err);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Gagal memperbarui status rekening bank',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Kelola Rekening Bank</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat data rekening bank...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Kelola Rekening Bank</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <h4 className="alert-heading">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Error!
              </h4>
              <p>{error}</p>
              <hr />
              <button className="btn btn-primary btn-sm" onClick={fetchBankAccounts}>
                <i className="fas fa-redo me-1"></i>
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      {/* Content Header */}
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Kelola Rekening Bank</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/settings">Settings</Link>
                </li>
                <li className="breadcrumb-item active">Rekening Bank</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content">
        <div className="container-fluid">
          {/* Action Buttons */}
          <div className="row mb-3">
            <div className="col-12">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCreate}
              >
                <i className="fas fa-plus"></i> Tambah Rekening Bank
              </button>
            </div>
          </div>

          {/* Bank Accounts Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-university me-1"></i>
                    Daftar Rekening Bank
                  </h3>
                  <div className="card-tools">
                    <button
                      type="button"
                      className="btn btn-tool"
                      data-card-widget="collapse"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                  </div>
                </div>
                <div className="card-body table-responsive p-0">
                  <table className="table table-striped table-hover text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Nama Bank</th>
                        <th>Nama Pemilik</th>
                        <th>Nomor Rekening</th>
                        <th>Status</th>
                        <th>Dibuat</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-university fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-2">
                                Belum ada rekening bank
                              </p>
                              <p className="text-muted small mb-0">
                                Klik tombol "Tambah Rekening Bank" untuk menambahkan rekening bank baru
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        bankAccounts.map((bankAccount) => (
                          <tr key={bankAccount.id}>
                            <td>
                              <strong>{bankAccount.bankName}</strong>
                            </td>
                            <td>{bankAccount.accountName}</td>
                            <td>
                              <code>{bankAccount.accountNumber}</code>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  bankAccount.isActive ? 'bg-success' : 'bg-secondary'
                                }`}
                              >
                                {bankAccount.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td>{formatDateTime(bankAccount.createdAt)}</td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  onClick={() => handleEdit(bankAccount)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${
                                    bankAccount.isActive ? 'btn-secondary' : 'btn-success'
                                  }`}
                                  onClick={() => handleToggleActive(bankAccount)}
                                  title={bankAccount.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  <i
                                    className={`fas ${
                                      bankAccount.isActive ? 'fa-toggle-on' : 'fa-toggle-off'
                                    }`}
                                  ></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDelete(bankAccount.id)}
                                  title="Hapus"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
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

      {/* Create/Edit Modal - Bootstrap 5 Modal */}
      {showCreateModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bankAccountModalLabel"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="bankAccountModalLabel">
                  <i className={`fas ${editingBankAccount ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                  {editingBankAccount ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Baru'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBankAccount(null);
                    setFormError(null);
                    setFieldErrors({});
                  }}
                  aria-label="Close"
                  disabled={formLoading}
                ></button>
              </div>
              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                      <i className="fas fa-exclamation-circle me-2"></i>
                      {formError}
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setFormError(null)}
                        aria-label="Close"
                      ></button>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="bankName" className="form-label">
                      <i className="fas fa-university me-1"></i>
                      Nama Bank <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.bankName ? 'is-invalid' : ''}`}
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => {
                        setFormData({ ...formData, bankName: e.target.value });
                        if (fieldErrors.bankName) {
                          setFieldErrors({ ...fieldErrors, bankName: undefined });
                        }
                      }}
                      required
                      disabled={formLoading}
                      placeholder="Contoh: BCA, Mandiri, BNI"
                    />
                    {fieldErrors.bankName && (
                      <div className="invalid-feedback">
                        {fieldErrors.bankName}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="accountName" className="form-label">
                      <i className="fas fa-user me-1"></i>
                      Nama Pemilik Rekening <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.accountName ? 'is-invalid' : ''}`}
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => {
                        setFormData({ ...formData, accountName: e.target.value });
                        if (fieldErrors.accountName) {
                          setFieldErrors({ ...fieldErrors, accountName: undefined });
                        }
                      }}
                      required
                      disabled={formLoading}
                      placeholder="Masukkan nama pemilik rekening"
                    />
                    {fieldErrors.accountName && (
                      <div className="invalid-feedback">
                        {fieldErrors.accountName}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="accountNumber" className="form-label">
                      <i className="fas fa-hashtag me-1"></i>
                      Nomor Rekening <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.accountNumber ? 'is-invalid' : ''}`}
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, accountNumber: value });
                        if (fieldErrors.accountNumber) {
                          setFieldErrors({ ...fieldErrors, accountNumber: undefined });
                        }
                      }}
                      required
                      disabled={formLoading}
                      placeholder="Masukkan nomor rekening (hanya angka)"
                    />
                    {fieldErrors.accountNumber && (
                      <div className="invalid-feedback">
                        {fieldErrors.accountNumber}
                      </div>
                    )}
                    <small className="form-text text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Hanya angka yang diperbolehkan
                    </small>
                  </div>

                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({ ...formData, isActive: e.target.checked })
                        }
                        disabled={formLoading}
                      />
                      <label className="form-check-label" htmlFor="isActive">
                        <i className="fas fa-toggle-on me-1"></i>
                        Aktifkan Rekening
                      </label>
                    </div>
                    <small className="form-text text-muted">
                      Rekening yang aktif akan ditampilkan di halaman publik outlet
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingBankAccount(null);
                      setFormError(null);
                      setFieldErrors({});
                    }}
                    disabled={formLoading}
                  >
                    <i className="fas fa-times me-1"></i>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        Simpan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
