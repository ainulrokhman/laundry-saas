'use client';

/**
 * Laporan Keuangan (Laba Kotor & HPP)
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import Swal from 'sweetalert2';

type ProfitData = {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  profitMargin: number;
  orderCount: number;
  startDate: string;
  endDate: string;
};

export default function AccountingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfitData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const user = session?.user as any;
      if (user.role !== 'OWNER') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateRange]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/accounting/profit?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.message || 'Gagal memuat data keuangan', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="content-wrapper p-4 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Memuat laporan keuangan...</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="content-header pt-3">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Laporan Laba Kotor</h1>
            </div>
            <div className="col-sm-6 text-sm-end mt-2 mt-sm-0">
               <Link href="/dashboard/accounting/simulation" className="btn btn-outline-primary btn-sm">
                 <i className="fas fa-calculator me-1"></i> Simulasi HPP
               </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {/* Filters */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Tanggal Mulai</label>
                  <input 
                    type="date" 
                    className="form-control form-control-sm" 
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Tanggal Selesai</label>
                  <input 
                    type="date" 
                    className="form-control form-control-sm" 
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <button className="btn btn-primary btn-sm w-100" onClick={fetchData} disabled={loading}>
                    <i className="fas fa-sync-alt me-1"></i> Perbarui Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Boxes */}
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info shadow-sm">
                <div className="inner">
                  <h3>{formatCurrency(data?.totalRevenue || 0)}</h3>
                  <p>Omzet (Lunas)</p>
                </div>
                <div className="icon">
                  <i className="fas fa-shopping-cart"></i>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger shadow-sm">
                <div className="inner">
                  <h3>{formatCurrency(data?.totalCogs || 0)}</h3>
                  <p>Total HPP</p>
                </div>
                <div className="icon">
                  <i className="fas fa-box-open"></i>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success shadow-sm">
                <div className="inner">
                  <h3>{formatCurrency(data?.grossProfit || 0)}</h3>
                  <p>Laba Kotor</p>
                </div>
                <div className="icon">
                  <i className="fas fa-chart-line"></i>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning shadow-sm">
                <div className="inner">
                  <h3>{data?.profitMargin || 0}%</h3>
                  <p>Margin Laba</p>
                </div>
                <div className="icon">
                  <i className="fas fa-percentage"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-md-12">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3">
                  <h3 className="card-title fw-bold">
                    <i className="fas fa-info-circle text-primary me-2"></i>
                    Tentang Laporan Ini
                  </h3>
                </div>
                <div className="card-body">
                  <p className="text-muted">
                    Laporan laba kotor dihitung berdasarkan pesanan yang berstatus <strong>LUNAS</strong> dalam rentang waktu yang dipilih. 
                    Nilai HPP diambil dari data <em>snapshot</em> saat pesanan dibuat, sehingga perubahan harga bahan baku di masa depan tidak akan memengaruhi laporan masa lalu.
                  </p>
                  <div className="alert alert-light border">
                    <i className="fas fa-lightbulb text-warning me-2"></i>
                    <strong>Tips:</strong> Untuk meningkatkan akurasi, pastikan Anda telah mengisi estimasi HPP di setiap layanan pada menu <Link href="/dashboard/services">Manajemen Layanan</Link>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
