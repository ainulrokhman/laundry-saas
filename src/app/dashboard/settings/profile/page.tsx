'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ContentHeader from '@/components/adminlte/ContentHeader';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setPhone((session.user as any).phone || '');
      setRole((session.user as any).role || '');
      setLoading(false);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      Swal.fire('Error', 'Nama tidak boleh kosong', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const json = await res.json();
      if (json.success) {
        await update({ name }); // Update session
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Profil berhasil diperbarui',
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error(json.error || 'Gagal memperbarui profil');
      }
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-wrapper pb-5">
        <ContentHeader title="Profil Saya" />
        <section className="content">
          <div className="container-fluid">
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrapper pb-5">
      <ContentHeader title="Profil Saya" />

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-4">
              {/* Profile Image Card */}
              <div className="card card-primary card-outline shadow-sm">
                <div className="card-body box-profile">
                  <div className="text-center mb-3">
                    <div
                      className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white mx-auto shadow"
                      style={{ width: '100px', height: '100px', fontSize: '40px' }}
                    >
                      {name ? name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>

                  <h3 className="profile-username text-center fw-bold">{name}</h3>
                  <p className="text-muted text-center">{role}</p>

                  <ul className="list-group list-group-unbordered mb-3">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <b>No. WhatsApp</b>
                      <span className="text-primary fw-medium">{phone}</span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <b>Role</b>
                      <span className="badge bg-info">{role}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-8">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h3 className="card-title fw-bold">Pengaturan Akun</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label fw-semibold">Nama Lengkap</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><i className="fas fa-user text-muted"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Masukkan nama lengkap"
                          required
                        />
                      </div>
                      <div className="form-text mt-2">Nama ini akan ditampilkan di dashboard dan nota.</div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="phone" className="form-label fw-semibold text-muted">Nomor WhatsApp (Tidak dapat diubah)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><i className="fas fa-phone text-muted"></i></span>
                        <input
                          type="text"
                          className="form-control bg-light"
                          id="phone"
                          value={phone}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary px-4 shadow-sm"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i> Simpan Perubahan
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Security Card */}
              <div className="card shadow-sm border-0 mt-4">
                <div className="card-header bg-white py-3">
                  <h3 className="card-title fw-bold text-danger">Keamanan</h3>
                </div>
                <div className="card-body">
                  <p className="text-muted mb-4">
                    Gunakan PIN untuk menjaga keamanan akun Anda. Pastikan PIN Anda tidak mudah ditebak oleh orang lain.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-danger px-4 shadow-sm"
                    onClick={() => {
                      // Trigger the change pin modal
                      // Since the modal is in DashboardLayout, we can use a custom event or just redirect to a page if it's better
                      // But the requirement is to fix "My Profile" page.
                      // I will implement a redirect or just tell the user to use the navbar button if I can't trigger the modal easily.
                      // Actually, I can just provide a button that opens the modal if I export the state or use a global state.
                      // For now, let's just make it clear how to change PIN.
                      const toggler = document.querySelector('[onClick*="setIsPinModalOpen(true)"]') as HTMLElement;
                      if (toggler) {
                        toggler.click();
                      } else {
                        // Fallback: try to find the button by text
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const pinButton = buttons.find(b => b.textContent?.includes('Ubah PIN')) as HTMLElement;
                        if (pinButton) pinButton.click();
                      }
                    }}
                  >
                    <i className="fas fa-key me-2"></i> Ubah PIN Keamanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
