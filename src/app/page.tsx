import type { Metadata } from 'next';
import Link from 'next/link';
import { PACKAGE_DEFINITIONS, PackageFeature, FEATURE_LABELS } from '@/constants/packageFeatures';
import { PWAInstallAlert } from '@/components/public/PWAInstallAlert';

export const metadata: Metadata = {
  title: 'Kasirlondri - Sistem Manajemen Laundry Modern',
  description: 'Kelola outlet laundry Anda dengan mudah. POS, Laporan Keuangan, Manajemen Karyawan, dan Multi-Outlet dalam satu aplikasi.',
};

export default function HomePage() {
  const packages = Object.values(PACKAGE_DEFINITIONS).sort((a, b) => a.sortOrder - b.sortOrder);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kasirlondri',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Sistem manajemen laundry modern dengan POS, laporan keuangan, dan aplikasi kasir.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
    author: {
      '@type': 'Organization',
      name: 'Kasirlondri',
      url: 'https://kasirlondri.vercel.app/',
    },
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 d-flex align-items-center justify-content-between">
          <Link href="/" className="text-decoration-none d-flex align-items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Kasirlondri Logo"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <div className="d-none d-md-flex align-items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-luxury-gold transition-colors text-decoration-none">Fitur</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-luxury-gold transition-colors text-decoration-none">Harga</a>
            <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-luxury-gold transition-colors text-decoration-none">FAQ</a>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 text-decoration-none px-3 py-2">
              Masuk
            </Link>
            <Link href="/register" className="btn btn-luxury-gold text-white text-sm px-4 py-2 rounded-full font-medium shadow-luxury hover-lift">
              Coba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-50/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 text-center">
          <div className="animate-in delay-100">
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100/50 text-orange-600 text-xs font-bold tracking-wide uppercase mb-6 border border-orange-100">
              Solusi #1 Pengusaha Laundry
            </span>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 text-balance">
              Kelola Bisnis Laundry <br className="d-none d-lg-block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">Lebih Cerdas & Profitable</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
              Tinggalkan cara lama. Beralih ke sistem kasir modern yang membantu Anda memantau operasional, keuangan, dan kinerja karyawan dari mana saja.
            </p>
            <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-3">
              <Link href="/register" className="btn btn-dark btn-lg px-8 py-3 rounded-full font-medium shadow-luxury hover-lift w-100 w-sm-auto">
                Mulai Sekarang - Gratis
              </Link>
              <Link href="#" className="btn btn-outline-secondary btn-lg px-8 py-3 rounded-full font-medium hover:bg-slate-50 w-100 w-sm-auto">
                <i className="fas fa-play-circle me-2"></i> Lihat Demo
              </Link>
            </div>
          </div>

          <div className="mt-20 relative mx-auto max-w-5xl animate-in delay-300">
            <div className="bg-slate-900 rounded-2xl p-2 shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10">
              {/* Abstract App Screenshot Placeholders */}
              <div className="bg-slate-800 rounded-xl overflow-hidden aspect-[16/9] d-flex align-items-center justify-content-center text-slate-600 relative">
                <div className="d-flex flex-column align-items-center gap-3">
                  <i className="fas fa-chart-pie text-6xl opacity-20"></i>
                  <span className="text-sm font-medium opacity-40">Dashboard Preview Coming Soon</span>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Fitur Lengkap untuk Skala Bisnis Apapun</h2>
            <p className="text-lg text-slate-600">Satu platform untuk menangani semua kebutuhan operasional laundry Anda.</p>
          </div>

          <div className="d-grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl d-flex align-items-center justify-content-center mb-6 text-blue-600">
                <i className="fas fa-cash-register text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">POS Kasir Modern</h3>
              <p className="text-slate-600 leading-relaxed">
                Catat pesanan dengan cepat. Mendukung berbagai metode pembayaran, cetak nota, dan kirim struk via WhatsApp.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-2xl d-flex align-items-center justify-content-center mb-6 text-green-600">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Laporan Real-time</h3>
              <p className="text-slate-600 leading-relaxed">
                Pantau omset harian, laba rugi, dan performa outlet dari smartphone Anda. Data disajikan dalam grafik interaktif.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl d-flex align-items-center justify-content-center mb-6 text-purple-600">
                <i className="fas fa-users text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Manajemen Pelanggan (CRM)</h3>
              <p className="text-slate-600 leading-relaxed">
                Simpan data pelanggan, riwayat pesanan, dan preferensi untuk memberikan pelayanan yang lebih personal.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl d-flex align-items-center justify-content-center mb-6 text-orange-600">
                <i className="fas fa-building text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Outlet</h3>
              <p className="text-slate-600 leading-relaxed">
                Kelola banyak cabang dalam satu akun. Pindahkan stok antar outlet dan konsolidasikan laporan dengan mudah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Pilihan Paket Transparan</h2>
            <p className="text-lg text-slate-600">Pilih paket yang sesuai dengan tahapan bisnis Anda. Upgrade kapan saja.</p>
          </div>

          <div className="row g-4 justify-content-center">
            {packages.map((pkg, index) => (
              <div key={pkg.slug} className={`col-lg-4 col-md-6 d-flex`}>
                <div className={`w-100 rounded-3xl p-8 transition-all duration-300 d-flex flex-column
                  ${pkg.slug === 'wangi' ? 'bg-slate-900 text-white shadow-xl scale-105 border-0 z-10' : 'bg-white text-slate-900 border border-slate-100 shadow-sm hover:shadow-lg'}
                `}>
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-2 ${pkg.slug === 'wangi' ? 'text-white' : 'text-slate-900'}`}>{pkg.name}</h3>
                    <div className="d-flex align-items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        Coming Soon
                      </span>
                    </div>
                    <p className={`mt-4 text-sm leading-relaxed ${pkg.slug === 'wangi' ? 'text-slate-300' : 'text-slate-500'}`}>
                      {pkg.description}
                    </p>
                  </div>

                  <ul className="d-flex flex-column gap-3 mb-8 flex-grow-1">
                    {pkg.features.slice(0, 8).map((feature: string) => (
                      <li key={feature} className="d-flex align-items-start gap-3 text-sm">
                        <i className={`fas fa-check-circle mt-1 ${pkg.slug === 'wangi' ? 'text-green-400' : 'text-green-500'}`}></i>
                        <span className={pkg.slug === 'wangi' ? 'text-slate-200' : 'text-slate-600'}>
                          {FEATURE_LABELS[feature as PackageFeature] || feature}
                        </span>
                      </li>
                    ))}
                    {pkg.features.length > 8 && (
                      <li className={`text-sm italic ${pkg.slug === 'wangi' ? 'text-slate-400' : 'text-slate-500'}`}>
                        + {pkg.features.length - 8} fitur lainnya...
                      </li>
                    )}
                  </ul>

                  <Link
                    href="/register"
                    className={`btn w-100 py-3 rounded-xl font-medium transition-all
                      ${pkg.slug === 'wangi'
                        ? 'bg-luxury-gold hover:bg-yellow-600 text-white border-0 shadow-lg shadow-yellow-500/25'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-0'}
                    `}
                  >
                    Pilih {pkg.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-8">Siap Mengembangkan Usaha Anda?</h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Bergabung dengan ribuan pengusaha laundry lainnya. Daftar sekarang, tanpa kartu kredit.
          </p>
          <Link href="/register" className="btn btn-luxury-gold btn-lg px-10 py-4 rounded-full font-bold shadow-luxury hover-lift">
            Daftar Gratis Sekarang
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="row g-12 mb-16">
            <div className="col-lg-4 mb-8 mb-lg-0">
              <div className="d-flex align-items-center gap-2 mb-6">
                <span className="bg-slate-900 text-white w-8 h-8 d-flex align-items-center justify-content-center rounded-lg">
                  <i className="fas fa-layer-group text-sm"></i>
                </span>
                <span className="font-bold text-xl text-slate-900">Kasirlondri</span>
              </div>
              <p className="text-slate-500 leading-relaxed mb-6 max-w-sm">
                Platform manajemen laundry terintegrasi untuk membantu Anda mengelola, memantau, dan mengembangkan bisnis dengan lebih efisien.
              </p>
              <div className="d-flex gap-4">
                <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-instagram text-xl"></i></a>
                <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-facebook text-xl"></i></a>
                <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><i className="fab fa-youtube text-xl"></i></a>
              </div>
            </div>

            <div className="col-lg-2 col-6 mb-8 mb-lg-0">
              <h4 className="font-bold text-slate-900 mb-6">Produk</h4>
              <ul className="d-flex flex-column gap-3 list-unstyled">
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Fitur</a></li>
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Harga</a></li>
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Hardware</a></li>
              </ul>
            </div>

            <div className="col-lg-2 col-6 mb-8 mb-lg-0">
              <h4 className="font-bold text-slate-900 mb-6">Perusahaan</h4>
              <ul className="d-flex flex-column gap-3 list-unstyled">
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Kontak</a></li>
                <li><a href="#" className="text-slate-500 hover:text-luxury-gold text-decoration-none transition-colors">Karir</a></li>
              </ul>
            </div>

            <div className="col-lg-4">
              <h4 className="font-bold text-slate-900 mb-6">Berlangganan Newsletter</h4>
              <div className="d-flex gap-2">
                <input type="email" placeholder="Email Anda" className="form-control rounded-lg border-slate-200" />
                <button className="btn btn-luxury-gold text-white rounded-lg px-4">Kirim</button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
            <p className="text-slate-400 text-sm mb-0">© {new Date().getFullYear()} Kasirlondri. All rights reserved.</p>
            <div className="d-flex gap-6">
              <a href="#" className="text-slate-400 hover:text-slate-900 text-sm text-decoration-none">Privacy Policy</a>
              <a href="#" className="text-slate-400 hover:text-slate-900 text-sm text-decoration-none">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
      <PWAInstallAlert description="Pasang aplikasi Kasirlondri untuk akses yang lebih cepat dan mudah dari homescreen Anda." />
    </div>
  );
}
