/**
 * Admin Outlets List Page
 * 
 * Displays list of all outlets for SuperAdmin management.
 * Includes CRUD operations with AdminLTE styling.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateTime, generateSlug } from '@/lib/utils';
import Swal from 'sweetalert2';
// Import SweetAlert2 CSS
import 'sweetalert2/dist/sweetalert2.min.css';

interface Outlet {
  id: string;
  name: string;
  slug: string;
  address: string;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  bankAccountCount?: number;
  paymentGatewayCount?: number;
}

export default function OutletsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    slug: '',
    isPro: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    address?: string;
    slug?: string;
  }>({});
  const [slugValidating, setSlugValidating] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session) {
      const user = session.user as any;
      if (user?.role !== 'SUPERADMIN') {
        router.push('/dashboard');
        return;
      }
      fetchOutlets();
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
  }, [outlets]);

  const fetchOutlets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/outlets');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch outlets');
      }

      setOutlets(data.data);
    } catch (err) {
      console.error('Error fetching outlets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load outlets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', address: '', slug: '', isPro: false });
    setFormError(null);
    setFieldErrors({});
    setSlugAvailable(null);
    setSlugValidating(false);
    setEditingOutlet(null);
    setShowCreateModal(true);
  };

  const handleEdit = (outlet: Outlet) => {
    setFormData({
      name: outlet.name,
      address: outlet.address,
      slug: outlet.slug,
      isPro: outlet.isPro,
    });
    setFormError(null);
    setFieldErrors({});
    setSlugAvailable(null);
    setSlugValidating(false);
    setEditingOutlet(outlet);
    setShowCreateModal(true);
  };

  // Validate slug format
  const validateSlugFormat = (slug: string): boolean => {
    if (!slug || slug.trim().length === 0) return true; // Empty is OK (will be auto-generated)
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  };

  // Check slug availability via API
  const checkSlugAvailability = async (slug: string): Promise<boolean> => {
    if (!slug || slug.trim().length === 0) return true; // Empty is OK
    
    // If editing and slug hasn't changed, it's available
    if (editingOutlet && slug.trim() === editingOutlet.slug) {
      return true;
    }

    try {
      const url = editingOutlet
        ? `/api/admin/outlets?checkSlug=${encodeURIComponent(slug.trim())}&excludeId=${editingOutlet.id}`
        : `/api/admin/outlets?checkSlug=${encodeURIComponent(slug.trim())}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.available === true; // Return true if slug is available
      }
      return false;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const errors: { name?: string; address?: string; slug?: string } = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nama outlet harus diisi';
    }
    
    if (!formData.address.trim()) {
      errors.address = 'Alamat harus diisi';
    }
    
    // Validate slug format and availability if provided
    if (formData.slug && formData.slug.trim().length > 0) {
      // Validate format
      if (!validateSlugFormat(formData.slug.trim())) {
        errors.slug = 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung';
      } else {
        // Check slug availability
        setSlugValidating(true);
        const isAvailable = await checkSlugAvailability(formData.slug.trim());
        setSlugValidating(false);
        
        if (!isAvailable) {
          // For update: if slug is the same as current outlet's slug, it's OK
          if (editingOutlet && formData.slug.trim() === editingOutlet.slug) {
            setSlugAvailable(true);
            // No error, same slug is allowed for update
          } else {
            // Slug is taken by another outlet
            if (editingOutlet) {
              errors.slug = 'Slug sudah digunakan oleh outlet lain';
            } else {
              errors.slug = 'Slug sudah digunakan. Silakan gunakan slug yang berbeda atau biarkan kosong untuk auto-generate';
            }
            setSlugAvailable(false);
          }
        } else {
          setSlugAvailable(true);
        }
      }
    }
    // Note: If slug is empty, backend will auto-generate it, so no need to validate here
    
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
      const url = editingOutlet
        ? `/api/admin/outlets/${editingOutlet.id}`
        : '/api/admin/outlets';
      const method = editingOutlet ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const fieldErrors: { name?: string; address?: string } = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            if (err.field === 'name') {
              fieldErrors.name = err.message;
            } else if (err.field === 'address') {
              fieldErrors.address = err.message;
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
        
        throw new Error(data.error || data.message || 'Failed to save outlet');
      }

      // Success - close modal and refresh list
      setShowCreateModal(false);
      setEditingOutlet(null);
      setFieldErrors({});
      setSlugAvailable(null);
      setSlugValidating(false);
      await fetchOutlets();

      // Show success message with SweetAlert
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: editingOutlet ? 'Outlet berhasil diperbarui' : 'Outlet berhasil dibuat',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error saving outlet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan outlet';
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
      title: 'Hapus Outlet?',
      text: 'Apakah Anda yakin ingin menghapus outlet ini? Tindakan ini tidak dapat dibatalkan.',
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
      const response = await fetch(`/api/admin/outlets/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to delete outlet');
      }

      await fetchOutlets();
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Outlet berhasil dihapus',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error deleting outlet:', err);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Gagal menghapus outlet',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  };

  const handleTogglePro = async (outlet: Outlet) => {
    try {
      const response = await fetch(`/api/admin/outlets/${outlet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPro: !outlet.isPro }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to update outlet');
      }

      await fetchOutlets();
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Status Pro outlet ${outlet.isPro ? 'dinonaktifkan' : 'diaktifkan'}`,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error toggling pro status:', err);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Gagal memperbarui status outlet',
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
                <h1 className="m-0">Kelola Outlet</h1>
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
              <p className="text-muted mt-2">Memuat data outlet...</p>
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
                <h1 className="m-0">Kelola Outlet</h1>
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
              <button className="btn btn-primary btn-sm" onClick={fetchOutlets}>
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
              <h1 className="m-0">Kelola Outlet</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/admin/outlets">Admin</Link>
                </li>
                <li className="breadcrumb-item active">Outlets</li>
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
                <i className="fas fa-plus"></i> Tambah Outlet
              </button>
            </div>
          </div>

          {/* Outlets Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-store me-1"></i>
                    Daftar Outlet
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
                        <th>Nama Outlet</th>
                        <th>Slug</th>
                        <th>Alamat</th>
                        <th>Status</th>
                        <th>Pengguna</th>
                        <th>Dibuat</th>
                        <th width="150">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outlets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-store fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-2">
                                Belum ada outlet
                              </p>
                              <p className="text-muted small mb-0">
                                Klik tombol "Tambah Outlet" untuk membuat outlet baru
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        outlets.map((outlet) => (
                          <tr key={outlet.id}>
                            <td>
                              <strong>{outlet.name}</strong>
                            </td>
                            <td>
                              <code>{outlet.slug}</code>
                            </td>
                            <td>{outlet.address}</td>
                            <td>
                              <span
                                className={`badge ${
                                  outlet.isPro ? 'bg-success' : 'bg-secondary'
                                }`}
                              >
                                {outlet.isPro ? 'Pro' : 'Basic'}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {outlet.userCount || 0} pengguna
                              </span>
                            </td>
                            <td>{formatDateTime(outlet.createdAt)}</td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <Link
                                  href={`/admin/outlets/${outlet.id}`}
                                  className="btn btn-info"
                                  title="Detail"
                                >
                                  <i className="fas fa-eye"></i>
                                </Link>
                                <button
                                  type="button"
                                  className="btn btn-warning"
                                  onClick={() => handleEdit(outlet)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${
                                    outlet.isPro ? 'btn-secondary' : 'btn-success'
                                  }`}
                                  onClick={() => handleTogglePro(outlet)}
                                  title={outlet.isPro ? 'Nonaktifkan Pro' : 'Aktifkan Pro'}
                                >
                                  <i
                                    className={`fas ${
                                      outlet.isPro ? 'fa-star' : 'fa-star-o'
                                    }`}
                                  ></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDelete(outlet.id)}
                                  title="Hapus"
                                  disabled={outlet.userCount && outlet.userCount > 0}
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
          aria-labelledby="outletModalLabel"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="outletModalLabel">
                  <i className={`fas ${editingOutlet ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                  {editingOutlet ? 'Edit Outlet' : 'Tambah Outlet Baru'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingOutlet(null);
                      setFormError(null);
                      setFieldErrors({});
                      setSlugAvailable(null);
                      setSlugValidating(false);
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
                    <label htmlFor="name" className="form-label">
                      <i className="fas fa-store me-1"></i>
                      Nama Outlet <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFormData({ ...formData, name: newName });
                        // Clear error when user starts typing
                        if (fieldErrors.name) {
                          setFieldErrors({ ...fieldErrors, name: undefined });
                        }
                        // Auto-generate slug from name if slug is empty (only for create)
                        if (!editingOutlet && !formData.slug && newName.trim()) {
                          const generatedSlug = generateSlug(newName);
                          if (generatedSlug) {
                            setFormData((prev) => ({ ...prev, slug: generatedSlug }));
                          }
                        }
                      }}
                      required
                      disabled={formLoading}
                      placeholder="Masukkan nama outlet"
                    />
                    {fieldErrors.name && (
                      <div className="invalid-feedback">
                        {fieldErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      Alamat <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`form-control ${fieldErrors.address ? 'is-invalid' : ''}`}
                      id="address"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        // Clear error when user starts typing
                        if (fieldErrors.address) {
                          setFieldErrors({ ...fieldErrors, address: undefined });
                        }
                      }}
                      required
                      disabled={formLoading}
                      placeholder="Masukkan alamat outlet"
                    />
                    {fieldErrors.address && (
                      <div className="invalid-feedback">
                        {fieldErrors.address}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="slug" className="form-label">
                      <i className="fas fa-link me-1"></i>
                      Slug (URL)
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className={`form-control ${
                          fieldErrors.slug
                            ? 'is-invalid'
                            : slugAvailable === true && formData.slug
                            ? 'is-valid'
                            : ''
                        }`}
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => {
                          const newSlug = e.target.value.toLowerCase();
                          setFormData({ ...formData, slug: newSlug });
                          // Clear errors when user starts typing
                          if (fieldErrors.slug) {
                            setFieldErrors({ ...fieldErrors, slug: undefined });
                          }
                          setSlugAvailable(null);
                        }}
                        onBlur={async () => {
                          // Validate slug format and availability on blur
                          if (formData.slug && formData.slug.trim().length > 0) {
                            if (!validateSlugFormat(formData.slug.trim())) {
                              setFieldErrors({
                                ...fieldErrors,
                                slug: 'Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung',
                              });
                              setSlugAvailable(false);
                            } else {
                              // Check availability
                              setSlugValidating(true);
                              const isAvailable = await checkSlugAvailability(formData.slug.trim());
                              setSlugValidating(false);
                              
                              if (!isAvailable) {
                                // For update: if slug is the same as current outlet's slug, it's OK
                                if (editingOutlet && formData.slug.trim() === editingOutlet.slug) {
                                  setSlugAvailable(true);
                                  // Clear error if it was set before
                                  if (fieldErrors.slug) {
                                    setFieldErrors({ ...fieldErrors, slug: undefined });
                                  }
                                } else {
                                  // Slug is taken by another outlet
                                  if (editingOutlet) {
                                    setFieldErrors({
                                      ...fieldErrors,
                                      slug: 'Slug sudah digunakan oleh outlet lain',
                                    });
                                  } else {
                                    setFieldErrors({
                                      ...fieldErrors,
                                      slug: 'Slug sudah digunakan. Silakan gunakan slug yang berbeda',
                                    });
                                  }
                                  setSlugAvailable(false);
                                }
                              } else {
                                setSlugAvailable(true);
                                // Clear error if slug is available
                                if (fieldErrors.slug) {
                                  setFieldErrors({ ...fieldErrors, slug: undefined });
                                }
                              }
                            }
                          } else {
                            // Clear slug validation state if slug is empty
                            setSlugAvailable(null);
                            if (fieldErrors.slug) {
                              setFieldErrors({ ...fieldErrors, slug: undefined });
                            }
                          }
                        }}
                        placeholder="Akan di-generate otomatis jika kosong"
                        disabled={formLoading}
                      />
                      {slugValidating && (
                        <span className="input-group-text">
                          <span
                            className="spinner-border spinner-border-sm text-primary"
                            role="status"
                            aria-hidden="true"
                          ></span>
                        </span>
                      )}
                      {slugAvailable === true && formData.slug && !slugValidating && (
                        <span className="input-group-text text-success">
                          <i className="fas fa-check"></i>
                        </span>
                      )}
                      {slugAvailable === false && formData.slug && !slugValidating && (
                        <span className="input-group-text text-danger">
                          <i className="fas fa-times"></i>
                        </span>
                      )}
                    </div>
                    {fieldErrors.slug && (
                      <div className="invalid-feedback d-block">
                        {fieldErrors.slug}
                      </div>
                    )}
                    {!fieldErrors.slug && slugAvailable === true && formData.slug && (
                      <div className="valid-feedback d-block">
                        <i className="fas fa-check-circle me-1"></i>
                        Slug tersedia
                      </div>
                    )}
                    {!fieldErrors.slug && slugAvailable === false && formData.slug && (
                      <div className="text-danger small">
                        <i className="fas fa-exclamation-circle me-1"></i>
                        {editingOutlet
                          ? 'Slug sudah digunakan oleh outlet lain'
                          : 'Slug sudah digunakan. Silakan gunakan slug yang berbeda'}
                      </div>
                    )}
                    <small className="form-text text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      Slug akan digunakan untuk URL publik: /outlet/[slug]. {editingOutlet ? 'Biarkan kosong untuk auto-generate dari nama.' : 'Biarkan kosong untuk auto-generate dari nama.'}
                    </small>
                  </div>

                  <div className="mb-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="isPro"
                        checked={formData.isPro}
                        onChange={(e) =>
                          setFormData({ ...formData, isPro: e.target.checked })
                        }
                        disabled={formLoading}
                      />
                      <label className="form-check-label" htmlFor="isPro">
                        <i className="fas fa-star me-1"></i>
                        Aktifkan Fitur Pro
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingOutlet(null);
                      setFormError(null);
                      setFieldErrors({});
                      setSlugAvailable(null);
                      setSlugValidating(false);
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
