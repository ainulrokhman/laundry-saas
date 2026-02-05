'use client';

/**
 * Landing Page Settings (OWNER)
 *
 * Mengelola konten landing page untuk outlet aktif (session.outletId).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type LandingPageData = {
  id: string;
  name: string;
  slug: string;
  address: string;
  description: string;
  contactPhone: string;
  businessHours: string;
  seoTitle: string;
  seoDescription: string;
  logoUrl: string;
  coverUrl: string;
};

export default function LandingPageSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const userRole = user?.role as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<LandingPageData | null>(null);
  const [form, setForm] = useState<Omit<LandingPageData, 'id' | 'name' | 'slug' | 'address'>>({
    description: '',
    contactPhone: '',
    businessHours: '',
    seoTitle: '',
    seoDescription: '',
    logoUrl: '',
    coverUrl: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const publicUrl = useMemo(() => {
    if (!data?.slug) return null;
    return `/outlet/${data.slug}`;
  }, [data?.slug]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session) {
      if (userRole !== 'OWNER') {
        router.push('/dashboard');
        return;
      }

      void fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      setFieldErrors({});

      const res = await fetch('/api/dashboard/settings/landing-page', { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Gagal memuat pengaturan landing page');
      }

      const payload: LandingPageData = json.data;
      setData(payload);
      setForm({
        description: payload.description || '',
        contactPhone: payload.contactPhone || '',
        businessHours: payload.businessHours || '',
        seoTitle: payload.seoTitle || '',
        seoDescription: payload.seoDescription || '',
        logoUrl: payload.logoUrl || '',
        coverUrl: payload.coverUrl || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat pengaturan landing page');
    } finally {
      setLoading(false);
    }
  }

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadToCloudinary(kind: 'logo' | 'cover', file: File): Promise<string> {
    const sigRes = await fetch('/api/dashboard/settings/landing-page/upload-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
    const sigJson = await sigRes.json().catch(() => null);
    if (!sigRes.ok || !sigJson?.success) {
      throw new Error(sigJson?.message || sigJson?.error || 'Gagal membuat signature upload');
    }

    const { cloudName, apiKey, timestamp, signature, folder, publicId } = sigJson.data || {};
    if (!cloudName || !apiKey || !timestamp || !signature || !folder || !publicId) {
      throw new Error('Signature upload tidak valid');
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', String(apiKey));
    fd.append('timestamp', String(timestamp));
    fd.append('signature', String(signature));
    fd.append('folder', String(folder));
    fd.append('public_id', String(publicId));

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    const uploadJson = await uploadRes.json().catch(() => null);
    if (!uploadRes.ok) {
      throw new Error(uploadJson?.error?.message || 'Upload gagal');
    }
    const url = String(uploadJson?.secure_url || '');
    if (!url) throw new Error('Upload berhasil, tetapi URL tidak tersedia');
    return url;
  }

  async function savePartial(update: Partial<typeof form>) {
    const res = await fetch('/api/dashboard/settings/landing-page', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error || 'Gagal menyimpan perubahan');
    }
    setData(json.data as LandingPageData);
  }

  async function handleUpload(kind: 'logo' | 'cover') {
    const file = kind === 'logo' ? logoFile : coverFile;
    if (!file) {
      await Swal.fire({
        icon: 'warning',
        title: 'File belum dipilih',
        text: `Pilih file ${kind} terlebih dahulu.`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      await Swal.fire({
        icon: 'error',
        title: 'Format tidak didukung',
        text: 'File harus berupa gambar.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const maxBytes = kind === 'logo' ? 1_000_000 : 3_000_000;
    if (file.size > maxBytes) {
      await Swal.fire({
        icon: 'error',
        title: 'Ukuran terlalu besar',
        text: kind === 'logo' ? 'Logo maksimal 1MB.' : 'Cover maksimal 3MB.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingCover(true);

    try {
      const url = await uploadToCloudinary(kind, file);
      if (kind === 'logo') {
        setField('logoUrl', url);
        await savePartial({ logoUrl: url });
        setLogoFile(null);
      } else {
        setField('coverUrl', url);
        await savePartial({ coverUrl: url });
        setCoverFile(null);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: kind === 'logo' ? 'Logo berhasil diupload.' : 'Cover berhasil diupload.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal upload',
        text: e instanceof Error ? e.message : 'Upload gagal.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      if (kind === 'logo') setUploadingLogo(false);
      else setUploadingCover(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setFieldErrors({});

    try {
      const clientErrors: Record<string, string> = {};

      if (form.contactPhone && !/^[0-9]+$/.test(form.contactPhone.trim())) {
        clientErrors.contactPhone = 'Nomor WhatsApp hanya boleh berisi angka';
      } else if (form.contactPhone && form.contactPhone.trim().length > 0 && form.contactPhone.trim().length < 8) {
        clientErrors.contactPhone = 'Nomor WhatsApp minimal 8 digit';
      }

      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        return;
      }

      const res = await fetch('/api/dashboard/settings/landing-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        if (Array.isArray(json?.errors)) {
          const fe: Record<string, string> = {};
          for (const err of json.errors) {
            if (err?.field && err?.message) {
              fe[String(err.field)] = String(err.message);
            }
          }
          if (Object.keys(fe).length > 0) {
            setFieldErrors(fe);
            return;
          }
        }
        throw new Error(json?.message || json?.error || 'Gagal menyimpan pengaturan landing page');
      }

      setData(json.data as LandingPageData);
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: json?.message || 'Pengaturan berhasil disimpan',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
        timer: 1500,
        timerProgressBar: true,
      });

      router.refresh();
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e instanceof Error ? e.message : 'Gagal menyimpan pengaturan landing page',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <h1 className="m-0">Landing Page Outlet</h1>
          </div>
        </div>
        <div className="content">
          <div className="container-fluid">
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-2">Memuat pengaturan...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Landing Page Outlet</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/dashboard/settings">Settings</Link>
                </li>
                <li className="breadcrumb-item active">Landing Page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="card card-info card-outline shadow-sm">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-store me-2"></i>
                Outlet Aktif
              </h3>
            </div>
            <div className="card-body">
              {!data ? (
                <div className="text-muted">Data outlet tidak tersedia.</div>
              ) : (
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                  <div>
                    <div className="fw-semibold">{data.name}</div>
                    <div className="text-muted">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      {data.address}
                    </div>
                  </div>
                  {publicUrl && (
                    <a className="btn btn-outline-info" href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-external-link-alt me-2"></i>
                      Buka Landing Page Publik
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="card shadow-sm">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-edit me-2"></i>
                  Konten Landing Page
                </h3>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold" htmlFor="description">
                      Deskripsi Outlet (opsional)
                    </label>
                    <textarea
                      id="description"
                      className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                      rows={4}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Contoh: Kami melayani cuci kiloan, satuan, dan paket dengan proses cepat."
                    />
                    {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
                    <div className="form-text">
                      Tampilkan hanya informasi yang benar-benar ada (tanpa klaim berlebihan).
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="contactPhone">
                      Nomor WhatsApp (opsional)
                    </label>
                    <input
                      id="contactPhone"
                      className={`form-control ${fieldErrors.contactPhone ? 'is-invalid' : ''}`}
                      value={form.contactPhone}
                      onChange={(e) => setField('contactPhone', e.target.value.replace(/\D/g, ''))}
                      placeholder="6281234567890"
                      inputMode="numeric"
                    />
                    {fieldErrors.contactPhone && <div className="invalid-feedback">{fieldErrors.contactPhone}</div>}
                    <div className="form-text">Format: 628xxxx (tanpa +, tanpa spasi).</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="businessHours">
                      Jam Operasional (opsional)
                    </label>
                    <textarea
                      id="businessHours"
                      className={`form-control ${fieldErrors.businessHours ? 'is-invalid' : ''}`}
                      rows={2}
                      value={form.businessHours}
                      onChange={(e) => setField('businessHours', e.target.value)}
                      placeholder="Senin–Sabtu 08.00–20.00"
                    />
                    {fieldErrors.businessHours && <div className="invalid-feedback">{fieldErrors.businessHours}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Logo (upload)</label>
                    <div className="card border shadow-sm">
                      <div className="card-body">
                        <div className="row g-3 align-items-start">
                          <div className="col-auto">
                            {form.logoUrl ? (
                              <Image
                                src={form.logoUrl}
                                alt="Logo outlet"
                                width={96}
                                height={96}
                                className="rounded border object-fit-cover bg-light"
                              />
                            ) : (
                              <div className="border rounded bg-light overflow-hidden" role="img" aria-label="Logo belum tersedia">
                                <div className="ratio ratio-1x1">
                                  <div className="d-flex align-items-center justify-content-center text-muted">
                                    <i className="fas fa-image"></i>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="col">
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control"
                              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                            />
                            <div className="form-text">
                              Rekomendasi: 1:1 (persegi). Maks 1MB.
                            </div>
                            {fieldErrors.logoUrl && <div className="text-danger small mt-1">{fieldErrors.logoUrl}</div>}
                          </div>

                          <div className="col-auto">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={uploadingLogo}
                              onClick={() => void handleUpload('logo')}
                            >
                              {uploadingLogo ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Upload...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-upload me-2"></i>
                                  Upload
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Cover (upload)</label>
                    <div className="card border shadow-sm">
                      <div className="card-body">
                        <div className="row g-3 align-items-start">
                          <div className="col-12">
                            <div className="border rounded bg-light overflow-hidden">
                              <div className="ratio ratio-21x9 position-relative">
                                {form.coverUrl ? (
                                  <Image src={form.coverUrl} alt="Cover outlet" fill className="object-fit-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                                ) : (
                                  <div className="d-flex align-items-center justify-content-center text-muted">
                                    <i className="fas fa-image"></i>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="col">
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control"
                              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                            />
                            <div className="form-text">
                              Rekomendasi: 21:9 (banner). Maks 3MB.
                            </div>
                            {fieldErrors.coverUrl && <div className="text-danger small mt-1">{fieldErrors.coverUrl}</div>}
                          </div>

                          <div className="col-auto">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={uploadingCover}
                              onClick={() => void handleUpload('cover')}
                            >
                              {uploadingCover ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  Upload...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-upload me-2"></i>
                                  Upload
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="seoTitle">
                      SEO Title (opsional)
                    </label>
                    <input
                      id="seoTitle"
                      className={`form-control ${fieldErrors.seoTitle ? 'is-invalid' : ''}`}
                      value={form.seoTitle}
                      onChange={(e) => setField('seoTitle', e.target.value)}
                      placeholder="Judul halaman untuk mesin pencari"
                    />
                    {fieldErrors.seoTitle && <div className="invalid-feedback">{fieldErrors.seoTitle}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="seoDescription">
                      SEO Description (opsional)
                    </label>
                    <textarea
                      id="seoDescription"
                      className={`form-control ${fieldErrors.seoDescription ? 'is-invalid' : ''}`}
                      rows={2}
                      value={form.seoDescription}
                      onChange={(e) => setField('seoDescription', e.target.value)}
                      placeholder="Ringkasan singkat untuk mesin pencari"
                    />
                    {fieldErrors.seoDescription && <div className="invalid-feedback">{fieldErrors.seoDescription}</div>}
                  </div>
                </div>
              </div>
              <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                <Link href="/dashboard/settings" className="btn btn-outline-secondary">
                  <i className="fas fa-arrow-left me-2"></i>
                  Kembali
                </Link>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

