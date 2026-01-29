'use client';

import React, { useEffect, useState } from 'react';
import ContentHeader from '@/components/adminlte/ContentHeader';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface Package {
    id: string;
    name: string;
    price: number;
    description: string;
    maxOutlets: number;
    features: string[];
}

export default function UpgradePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);

    // Upload State
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const res = await fetch('/api/packages');
            const json = await res.json();
            if (json.success) {
                setPackages(json.data);
            }
        } catch (error) {
            console.error('Error fetching packages:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const handleSelectPackage = (pkg: Package) => {
        setSelectedPackage(pkg);
        setStep(2);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const uploadToCloudinary = async (file: File): Promise<string> => {
        // 1. Get Signature
        const sigRes = await fetch('/api/dashboard/subscription/upload-signature', { method: 'POST' });
        const sigJson = await sigRes.json();

        if (!sigJson.success) throw new Error(sigJson.error || 'Failed to get signature');
        const { signature, timestamp, apiKey, cloudName, folder, publicId } = sigJson.data;

        // 2. Upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('public_id', publicId);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (uploadJson.secure_url) {
            return uploadJson.secure_url;
        } else {
            throw new Error('Upload failed');
        }
    };

    const handleSubmit = async () => {
        if (!file || !selectedPackage) return;

        setUploading(true);
        try {
            // 1. Upload Proof
            const proofUrl = await uploadToCloudinary(file);

            // 2. Submit Upgrade Request
            const res = await fetch('/api/subscription/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: selectedPackage.id,
                    proofUrl: proofUrl,
                }),
            });

            const json = await res.json();
            if (json.success) {
                Swal.fire('Berhasil!', 'Permintaan upgrade berhasil dikirim. Admin akan memverifikasi pembayaran Anda.', 'success')
                    .then(() => {
                        router.push('/dashboard/settings/subscription');
                    });
            } else {
                throw new Error(json.error || 'Gagal mengirim permintaan');
            }

        } catch (error: any) {
            Swal.fire('Error', error.message || 'Terjadi kesalahan', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Loading packages...</div>;
    }

    return (
        <div className="content-wrapper">
            <ContentHeader title="Upgrade Paket Langganan" />

            <div className="content">
                <div className="container-fluid">

                    {/* Progress Wizard */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="d-flex justify-content-center align-items-center">
                                <div className={`btn btn-circle btn-${step >= 1 ? 'primary' : 'secondary'}`}>1</div>
                                <div style={{ width: '50px', height: '2px' }} className={`bg-${step >= 2 ? 'primary' : 'secondary'}`}></div>
                                <div className={`btn btn-circle btn-${step >= 2 ? 'primary' : 'secondary'}`}>2</div>
                            </div>
                            <div className="d-flex justify-content-center mt-2 gap-5">
                                <span>Pilih Paket</span>
                                <span>Pembayaran</span>
                            </div>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="row">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="col-md-4">
                                    <div className="card card-outline card-primary h-100">
                                        <div className="card-header text-center">
                                            <h3>{pkg.name}</h3>
                                        </div>
                                        <div className="card-body text-center">
                                            <h1 className="display-4 text-primary">{formatCurrency(pkg.price)}</h1>
                                            <p className="text-muted">/ bulan</p>
                                            <hr />
                                            {pkg.maxOutlets > 1 ? (
                                                <h5>{pkg.maxOutlets} Outlet</h5>
                                            ) : (
                                                <h5>1 Outlet</h5>
                                            )}
                                            <p className="mt-3">{pkg.description}</p>
                                            {/* Features if implemented */}
                                        </div>
                                        <div className="card-footer">
                                            <button
                                                className="btn btn-primary btn-block w-100"
                                                onClick={() => handleSelectPackage(pkg)}
                                            >
                                                Pilih Paket
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {step === 2 && selectedPackage && (
                        <div className="row justify-content-center">
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Instruksi Pembayaran</h3>
                                        <div className="card-tools">
                                            <button className="btn btn-sm btn-tool" onClick={() => setStep(1)}>
                                                <i className="fas fa-arrow-left"></i> Kembali
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="alert alert-info">
                                            Anda akan melakukan upgrade ke paket <strong>{selectedPackage.name}</strong> seharga <strong>{formatCurrency(selectedPackage.price)}</strong>.
                                        </div>

                                        <h5>Transfer Bank Manual</h5>
                                        <p>Silakan transfer ke rekening berikut:</p>
                                        <div className="callout callout-warning">
                                            <p><strong>Bank BCA</strong></p>
                                            <p>No. Rek: <strong>1234567890</strong></p>
                                            <p>Atas Nama: <strong>PT Laundry SaaS</strong></p>
                                            <p className="text-muted text-sm mt-2">Berita transfer: Upgrade {selectedPackage.name}</p>
                                        </div>

                                        <div className="form-group mt-4">
                                            <label>Upload Bukti Transfer</label>
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <small className="text-muted">Format: JPG, PNG. Maks 2MB.</small>
                                        </div>

                                        <div className="mt-4">
                                            <button
                                                className="btn btn-success w-100"
                                                onClick={handleSubmit}
                                                disabled={!file || uploading}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Mengupload...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-check-circle me-2"></i> Konfirmasi Pembayaran
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
