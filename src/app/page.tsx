import type { Metadata } from 'next';
import Link from 'next/link';

import { TrackOrderGlobal } from '@/components/public/TrackOrderGlobal';

export const metadata: Metadata = {
  title: 'Beranda',
};

export default function HomePage() {
  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      <header className="border-bottom bg-white">
        <div className="container py-3 d-flex align-items-center justify-content-between">
          <Link href="/" className="text-decoration-none">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary">
                <i className="fas fa-shirt me-1"></i>
                Ainul
              </span>
              <span className="fw-bold text-dark">Kasirlondri</span>
            </div>
          </Link>
          <div className="d-flex gap-2">
            <Link href="/login" className="btn btn-outline-primary btn-sm">
              <i className="fas fa-sign-in-alt me-2"></i>
              Masuk
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-4 py-md-5 flex-grow-1">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card shadow-sm border-0 overflow-hidden mb-3">
              <div className="bg-dark text-white p-4 p-md-5">
                <div className="row g-4 align-items-center">
                  <div className="col-md-7">
                    <span className="badge bg-light text-dark border">
                      <i className="fas fa-shield-alt me-1"></i>
                      Data sesuai yang tersedia
                    </span>
                    <h1 className="display-6 fw-semibold mt-2 mb-2">
                      Lacak pesanan laundry Anda
                    </h1>
                    <p className="lead mb-0 text-white-50">
                      Masukkan slug outlet dan tracking code untuk melihat status terbaru. Anda juga bisa membuka halaman outlet untuk info layanan & harga (jika tersedia).
                    </p>
                  </div>
                  <div className="col-md-5">
                    <div className="bg-white bg-opacity-10 rounded p-3">
                      <div className="fw-semibold mb-2">
                        <i className="fas fa-bolt me-2"></i>
                        Ringkas & mudah
                      </div>
                      <ul className="list-unstyled mb-0 text-white-50 small vstack gap-2">
                        <li>
                          <i className="fas fa-search me-2"></i>
                          Lacak status pesanan
                        </li>
                        <li>
                          <i className="fas fa-store me-2"></i>
                          Buka halaman outlet
                        </li>
                        <li>
                          <i className="fas fa-map-marked-alt me-2"></i>
                          Arah ke Maps (di halaman outlet)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <TrackOrderGlobal />

            <div className="row g-3 mt-3">
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-primary">1</span>
                      <div className="fw-semibold">Cari outlet</div>
                    </div>
                    <div className="text-muted small">
                      Buka halaman outlet menggunakan slug untuk melihat informasi yang tersedia.
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-primary">2</span>
                      <div className="fw-semibold">Masukkan tracking code</div>
                    </div>
                    <div className="text-muted small">
                      Masukkan kode yang Anda terima untuk melihat status proses.
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge bg-primary">3</span>
                      <div className="fw-semibold">Pantau progres</div>
                    </div>
                    <div className="text-muted small">
                      Timeline status membantu Anda memantau tahap pengerjaan.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm mt-3">
              <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">
                    <i className="fas fa-user-shield me-2 text-primary"></i>
                    Anda pemilik/staff laundry?
                  </div>
                  <div className="text-muted small">
                    Masuk untuk mengelola order, layanan, dan pengaturan outlet.
                  </div>
                </div>
                <Link href="/login" className="btn btn-primary">
                  <i className="fas fa-tachometer-alt me-2"></i>
                  Masuk Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-top bg-white">
        <div className="container py-3 d-flex align-items-center justify-content-between flex-wrap gap-2 text-muted small">
          <div>© {new Date().getFullYear()} Kasirlondri</div>
          <div>
            <i className="fas fa-shield-alt me-2"></i>
            Tanpa klaim berlebihan: hanya menampilkan data yang tersedia
          </div>
        </div>
      </footer>
    </div>
  );
}
