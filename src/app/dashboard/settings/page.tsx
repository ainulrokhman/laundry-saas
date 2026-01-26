/**
 * Settings Index Page
 * 
 * Main settings page that provides navigation to various settings sub-pages.
 * Displays cards/links to different settings sections based on user role.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SettingsCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  roles: string[];
}

const settingsCards: SettingsCard[] = [
  {
    title: 'Change PIN',
    description: 'Ubah PIN login Anda untuk keamanan akun',
    icon: 'fas fa-key',
    href: '/dashboard/settings/change-pin',
    color: 'primary',
    roles: ['OWNER', 'STAFF'],
  },
  {
    title: 'Manajemen Staff',
    description: 'Kelola akun staff untuk outlet aktif Anda',
    icon: 'fas fa-users',
    href: '/dashboard/settings/staff',
    color: 'warning',
    roles: ['OWNER'],
  },
  {
    title: 'Bank Accounts',
    description: 'Kelola rekening bank untuk pembayaran transfer',
    icon: 'fas fa-university',
    href: '/dashboard/settings/bank-accounts',
    color: 'success',
    roles: ['OWNER'],
  },
  {
    title: 'Landing Page Outlet',
    description: 'Atur konten halaman publik outlet (tanpa klaim berlebihan)',
    icon: 'fas fa-store',
    href: '/dashboard/settings/landing-page',
    color: 'info',
    roles: ['OWNER'],
  },
  // Future settings can be added here:
  // {
  //   title: 'Payment Gateways',
  //   description: 'Konfigurasi payment gateway (Midtrans, Xendit)',
  //   icon: 'fas fa-credit-card',
  //   href: '/dashboard/settings/payment-gateways',
  //   color: 'info',
  //   roles: ['OWNER'],
  // },
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session) {
      const user = session.user as any;
      // Only OWNER and STAFF can access settings
      if (user?.role !== 'OWNER' && user?.role !== 'STAFF') {
        router.push('/dashboard');
        return;
      }
      setLoading(false);
    }
  }, [status, session, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Settings</h1>
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
              <p className="text-muted mt-2">Memuat halaman settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = session?.user as any;
  const userRole = user?.role;

  // Filter settings cards based on user role
  const availableCards = settingsCards.filter((card) =>
    card.roles.includes(userRole)
  );

  return (
    <div className="content-wrapper">
      {/* Content Header */}
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Settings</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Settings</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content">
        <div className="container-fluid">
          {/* Welcome Section */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-cog me-2"></i>
                    Pengaturan Sistem
                  </h3>
                </div>
                <div className="card-body">
                  <p className="mb-0">
                    Kelola pengaturan akun dan sistem Anda dari halaman ini. Pilih salah satu opsi di bawah untuk mengakses pengaturan tertentu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Cards */}
          <div className="row">
            {availableCards.length === 0 ? (
              <div className="col-12">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="fas fa-cog fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted mb-2">Tidak Ada Pengaturan Tersedia</h5>
                    <p className="text-muted mb-0">
                      Tidak ada pengaturan yang tersedia untuk role Anda saat ini.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              availableCards.map((card) => (
                <div key={card.href} className="col-lg-6 col-md-6 mb-4">
                  <Link
                    href={card.href}
                    className="text-decoration-none"
                  >
                    <div className={`card card-${card.color} card-outline h-100 shadow-sm`}>
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className={`bg-${card.color} rounded me-3 d-flex align-items-center justify-content-center`} style={{ width: '70px', height: '70px' }}>
                            <i className={`${card.icon} fa-2x text-white`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="card-title mb-2 fw-bold">{card.title}</h5>
                            <p className="card-text text-muted mb-0 small">
                              {card.description}
                            </p>
                          </div>
                          <div className="ms-3">
                            <i className={`fas fa-chevron-right text-${card.color} fs-4`}></i>
                          </div>
                        </div>
                      </div>
                      <div className={`card-footer bg-${card.color} bg-opacity-10 border-top-0`}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            Klik untuk membuka pengaturan
                          </span>
                          <i className={`fas fa-arrow-right text-${card.color}`}></i>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
