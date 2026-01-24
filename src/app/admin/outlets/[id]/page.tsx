/**
 * Admin Outlet Detail Page
 * 
 * Displays detailed information about a specific outlet.
 * Shows users, bank accounts, payment gateway configs, and statistics.
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';

interface OutletDetail {
  id: string;
  name: string;
  slug: string;
  address: string;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
  users?: Array<{
    id: string;
    name: string;
    phone: string;
    role: string;
    isActive: boolean;
  }>;
  bankAccounts?: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isActive: boolean;
  }>;
  paymentGatewayConfigs?: Array<{
    id: string;
    gatewayType: string;
    isActive: boolean;
  }>;
}

export default function OutletDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const outletId = params?.id as string;

  const [outlet, setOutlet] = useState<OutletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      fetchOutlet();
    }
  }, [status, session, router, outletId]);

  // Initialize card collapse widgets after content loads
  useEffect(() => {
    if (!outlet) return;

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
  }, [outlet]);

  const fetchOutlet = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/outlets/${outletId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to fetch outlet');
      }

      setOutlet(data.data);
    } catch (err) {
      console.error('Error fetching outlet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load outlet');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Detail Outlet</h1>
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
              <p className="text-muted mt-2">Memuat detail outlet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !outlet) {
    return (
      <div className="content-wrapper">
        <div className="content-header pt-3">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Detail Outlet</h1>
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
              <p>{error || 'Outlet tidak ditemukan'}</p>
              <hr />
              <Link href="/admin/outlets" className="btn btn-primary btn-sm">
                <i className="fas fa-arrow-left me-1"></i>
                Kembali ke Daftar Outlet
              </Link>
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
              <h1 className="m-0">Detail Outlet</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-end">
                <li className="breadcrumb-item">
                  <Link href="/admin/outlets">Admin</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/admin/outlets">Outlets</Link>
                </li>
                <li className="breadcrumb-item active">{outlet.name}</li>
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
              <Link href="/admin/outlets" className="btn btn-secondary btn-sm">
                <i className="fas fa-arrow-left me-1"></i> Kembali ke Daftar
              </Link>
            </div>
          </div>

          {/* Outlet Information Card */}
          <div className="row mb-3">
            <div className="col-md-12">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-store me-1"></i>
                    Informasi Outlet
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
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3 col-md-2">Nama Outlet</dt>
                    <dd className="col-sm-9 col-md-10">
                      <strong>{outlet.name}</strong>
                    </dd>

                    <dt className="col-sm-3 col-md-2">Slug</dt>
                    <dd className="col-sm-9 col-md-10">
                      <code className="text-primary">{outlet.slug}</code>
                    </dd>

                    <dt className="col-sm-3 col-md-2">Alamat</dt>
                    <dd className="col-sm-9 col-md-10">{outlet.address}</dd>

                    <dt className="col-sm-3 col-md-2">Status</dt>
                    <dd className="col-sm-9 col-md-10">
                      <span
                        className={`badge ${
                          outlet.isPro ? 'bg-success' : 'bg-secondary'
                        }`}
                      >
                        <i className={`fas ${outlet.isPro ? 'fa-star' : 'fa-star-o'} me-1`}></i>
                        {outlet.isPro ? 'Pro' : 'Basic'}
                      </span>
                    </dd>

                    <dt className="col-sm-3 col-md-2">Dibuat</dt>
                    <dd className="col-sm-9 col-md-10">
                      <i className="fas fa-calendar me-1 text-muted"></i>
                      {formatDateTime(outlet.createdAt)}
                    </dd>

                    <dt className="col-sm-3 col-md-2">Diperbarui</dt>
                    <dd className="col-sm-9 col-md-10">
                      <i className="fas fa-clock me-1 text-muted"></i>
                      {formatDateTime(outlet.updatedAt)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="row mb-3">
            <div className="col-lg-3 col-6 mb-3">
              <div className="small-box text-bg-info">
                <div className="inner">
                  <h3>{outlet.users?.length || 0}</h3>
                  <p>Total Pengguna</p>
                </div>
                <svg
                  className="small-box-icon"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z"></path>
                </svg>
              </div>
            </div>

            <div className="col-lg-3 col-6 mb-3">
              <div className="small-box text-bg-success">
                <div className="inner">
                  <h3>{outlet.bankAccounts?.length || 0}</h3>
                  <p>Rekening Bank</p>
                </div>
                <svg
                  className="small-box-icon"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M11.25 16.5A4.5 4.5 0 0016.5 12h-1.5a3 3 0 11-3-3c.55 0 1.05.12 1.5.34V9a3 3 0 013-3h1.5a4.5 4.5 0 00-4.5 4.5v7zM16.5 12a4.5 4.5 0 01-4.5 4.5v-7a4.5 4.5 0 014.5-4.5h1.5a3 3 0 013 3v1.5a3 3 0 01-3 3h-1.5z"></path>
                </svg>
              </div>
            </div>

            <div className="col-lg-3 col-6 mb-3">
              <div className="small-box text-bg-warning">
                <div className="inner">
                  <h3>{outlet.paymentGatewayConfigs?.length || 0}</h3>
                  <p>Payment Gateway</p>
                </div>
                <svg
                  className="small-box-icon"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-users me-1"></i>
                    Pengguna Outlet
                    {outlet.users && outlet.users.length > 0 && (
                      <span className="badge bg-info ms-2">{outlet.users.length}</span>
                    )}
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
                        <th>Nama</th>
                        <th>Nomor Telepon</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!outlet.users || outlet.users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-users fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-0">
                                Belum ada pengguna untuk outlet ini
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        outlet.users.map((user) => (
                          <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.phone}</td>
                            <td>
                              <span
                                className={`badge ${
                                  user.role === 'OWNER'
                                    ? 'bg-primary'
                                    : user.role === 'STAFF'
                                    ? 'bg-info'
                                    : 'bg-secondary'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  user.isActive ? 'bg-success' : 'bg-danger'
                                }`}
                              >
                                {user.isActive ? 'Aktif' : 'Tidak Aktif'}
                              </span>
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

          {/* Bank Accounts Table */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-success card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-university me-1"></i>
                    Rekening Bank
                    {outlet.bankAccounts && outlet.bankAccounts.length > 0 && (
                      <span className="badge bg-success ms-2">{outlet.bankAccounts.length}</span>
                    )}
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
                        <th>Bank</th>
                        <th>Nomor Rekening</th>
                        <th>Nama Pemilik</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!outlet.bankAccounts ||
                      outlet.bankAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-university fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-0">
                                Belum ada rekening bank untuk outlet ini
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        outlet.bankAccounts.map((account) => (
                          <tr key={account.id}>
                            <td>{account.bankName}</td>
                            <td>{account.accountNumber}</td>
                            <td>{account.accountName}</td>
                            <td>
                              <span
                                className={`badge ${
                                  account.isActive
                                    ? 'bg-success'
                                    : 'bg-secondary'
                                }`}
                              >
                                {account.isActive ? 'Aktif' : 'Tidak Aktif'}
                              </span>
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

          {/* Payment Gateway Configs Table */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-warning card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-credit-card me-1"></i>
                    Payment Gateway
                    {outlet.paymentGatewayConfigs && outlet.paymentGatewayConfigs.length > 0 && (
                      <span className="badge bg-warning ms-2">{outlet.paymentGatewayConfigs.length}</span>
                    )}
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
                        <th>Gateway Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!outlet.paymentGatewayConfigs ||
                      outlet.paymentGatewayConfigs.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center py-5">
                            <div className="empty-state">
                              <i className="fas fa-credit-card fa-3x text-muted mb-3"></i>
                              <p className="text-muted mb-0">
                                Belum ada konfigurasi payment gateway untuk outlet ini
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        outlet.paymentGatewayConfigs.map((config) => (
                          <tr key={config.id}>
                            <td>{config.gatewayType}</td>
                            <td>
                              <span
                                className={`badge ${
                                  config.isActive
                                    ? 'bg-success'
                                    : 'bg-secondary'
                                }`}
                              >
                                {config.isActive ? 'Aktif' : 'Tidak Aktif'}
                              </span>
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
    </div>
  );
}
