import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { OutletRepository } from '@/repositories/OutletRepository';
import { ServiceRepository } from '@/repositories/ServiceRepository';
import { OutletPublicDTO } from '@/dto/OutletPublicDTO';
import { ServiceDTO } from '@/dto/ServiceDTO';
import { formatCurrency } from '@/lib/utils';
import { OwnerPublicBar } from '@/components/public/OwnerPublicBar';
import { TrackOrderInline } from '@/components/public/TrackOrderInline';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const outletRepository = new OutletRepository();
const serviceRepository = new ServiceRepository();

const getOutletBySlug = cache(async (slug: string) => {
  return await outletRepository.findPublicBySlug(slug);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const outlet = await getOutletBySlug(slug);

  if (!outlet) {
    return {
      title: 'Outlet tidak ditemukan',
      description: 'Outlet yang Anda cari tidak tersedia.',
      robots: { index: false, follow: false },
    };
  }

  const title = outlet.seoTitle?.trim() || outlet.name;
  const description =
    outlet.seoDescription?.trim() ||
    outlet.description?.trim() ||
    `Informasi outlet ${outlet.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/outlet/${outlet.slug}` },
    openGraph: {
      title,
      description,
      url: `/outlet/${outlet.slug}`,
      type: 'website',
      ...(outlet.coverUrl && {
        images: [{ url: outlet.coverUrl }],
      }),
    },
  };
}

function buildWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function buildMapsUrl(name: string, address: string): string {
  const q = encodeURIComponent(`${name} ${address}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function formatServiceType(type: string): string {
  const t = String(type || '').toUpperCase();
  if (t === 'KILOAN') return 'Kiloan';
  if (t === 'SATUAN') return 'Satuan';
  if (t === 'PAKET') return 'Paket';
  return t || 'Layanan';
}

export default async function OutletLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const outlet = await getOutletBySlug(slug);

  if (!outlet) {
    notFound();
  }

  const outletPublic = OutletPublicDTO.toResponse(outlet);

  const services = await serviceRepository.findActiveByOutletId(outlet.id);
  const publicServices = ServiceDTO.toPublicResponseArray(services);

  const hasContactPhone = Boolean(outletPublic.contactPhone && outletPublic.contactPhone.replace(/\D/g, '').length >= 8);
  const waUrl = hasContactPhone ? buildWhatsAppUrl(outletPublic.contactPhone as string) : null;
  const mapsUrl = buildMapsUrl(outletPublic.name, outletPublic.address);

  const hasCover = Boolean(outletPublic.coverUrl);
  const hasLogo = Boolean(outletPublic.logoUrl);
  const hasDescription = Boolean(outletPublic.description && outletPublic.description.trim().length > 0);
  const hasBusinessHours = Boolean(outletPublic.businessHours && outletPublic.businessHours.trim().length > 0);
  const hasServices = publicServices.length > 0;

  const seoTitleRaw = typeof outletPublic.seoTitle === 'string' ? outletPublic.seoTitle.trim() : '';
  const seoDescriptionRaw =
    typeof outletPublic.seoDescription === 'string' ? outletPublic.seoDescription.trim() : '';
  const heroTagline = seoTitleRaw && seoTitleRaw !== outletPublic.name ? seoTitleRaw : null;
  const heroLead = seoDescriptionRaw || null;

  const servicesByType = publicServices.reduce<Record<string, any[]>>((acc, svc: any) => {
    const key = String(svc.type || 'LAINNYA').toUpperCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(svc);
    return acc;
  }, {});
  const typePriority = ['KILOAN', 'SATUAN', 'PAKET'];
  const serviceTypes = Object.keys(servicesByType).sort((a, b) => {
    const ia = typePriority.indexOf(a);
    const ib = typePriority.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="bg-light min-vh-100 font-sans tracking-wide">
      {/* Owner Bar */}
      <div className="bg-luxury-dark border-bottom border-white border-opacity-10">
        <div className="container py-2">
          <OwnerPublicBar slug={slug} />
        </div>
      </div>

      {/* Luxury Hero Section */}
      <section className="position-relative bg-luxury-dark text-white overflow-hidden" style={{ minHeight: '60vh' }}>
        {hasCover ? (
          <>
            <img
              src={outletPublic.coverUrl as string}
              alt={`Cover ${outletPublic.name}`}
              className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover opacity-40 animate-in"
              style={{ filter: 'blur(0px)', transition: 'transform 10s ease' }}
            />
            <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br from-luxury-dark via-luxury-dark to-transparent opacity-90"></div>
          </>
        ) : (
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br from-luxury-dark via-gray-900 to-luxury-dark"></div>
        )}

        <div className="container position-relative h-100 d-flex flex-column justify-content-center py-5">
          <div className="row align-items-center justify-content-center text-center animate-in delay-100">
            <div className="col-lg-8">
              <div className="mb-4 d-inline-block position-relative">
                {hasLogo ? (
                  <img
                    src={outletPublic.logoUrl as string}
                    alt="Logo"
                    className="rounded-circle border border-4 border-luxury-gold shadow-luxury"
                    width={100}
                    height={100}
                  />
                ) : (
                  <div className="bg-luxury-gold rounded-circle d-flex align-items-center justify-content-center shadow-luxury" style={{ width: 100, height: 100 }}>
                    <i className="fas fa-store fa-3x text-white"></i>
                  </div>
                )}
              </div>

              <h1 className="display-4 fw-bold mb-3 tracking-tight">
                {outletPublic.name}
              </h1>

              {heroTagline && (
                <p className="lead text-luxury-gold fw-medium mb-4 text-uppercase tracking-widest small">
                  {heroTagline}
                </p>
              )}

              <div className="d-flex align-items-center justify-content-center gap-2 mb-5 text-white-50">
                <i className="fas fa-map-marker-alt text-luxury-gold"></i>
                <span>{outletPublic.address}</span>
              </div>

              <div className="d-flex justify-content-center flex-wrap gap-3">
                <a href="#track-order" className="btn btn-luxury-gold btn-lg rounded-pill px-5 shadow-lg">
                  <i className="fas fa-search me-2"></i> Lacak Pesanan
                </a>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light btn-lg rounded-pill px-5 hover-scale">
                  <i className="fas fa-location-arrow me-2"></i> Lokasi
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Glassmorphism */}
      <main className="container py-5" style={{ marginTop: '-80px', position: 'relative', zIndex: 10 }}>
        <div className="row g-4 justify-content-center">

          {/* Left Column: Track & Info */}
          <div className="col-lg-4 order-lg-last animate-in delay-200 mt-lg-5 pt-lg-5">
            {/* Track Order Card */}
            <div id="track-order" className="glass-panel text-dark shadow-luxury rounded-4 mb-4 overflow-hidden">
              <div className="p-4 border-bottom border-secondary border-opacity-10 bg-white bg-opacity-50">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-luxury-dark">
                  <i className="fas fa-search text-luxury-gold"></i>
                  Cek Status
                </h5>
              </div>
              <div className="p-4">
                <TrackOrderInline slug={slug} />
              </div>
            </div>

            {/* Outlet Info Card */}
            <div className="glass-panel text-dark shadow-luxury rounded-4 mb-4 p-4">
              <h6 className="fw-bold text-uppercase tracking-widest text-muted mb-4 small">Informasi Outlet</h6>

              {hasDescription && (
                <div className="mb-4 text-secondary">
                  {outletPublic.description}
                </div>
              )}

              <div className="vstack gap-4">
                <div className="d-flex gap-3 align-items-start">
                  <div className="bg-luxury-gold bg-opacity-10 p-2 rounded text-luxury-gold">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Jam Operasional</div>
                    <p className="small text-muted mb-0">{outletPublic.businessHours || '-'}</p>
                  </div>
                </div>
                <div className="d-flex gap-3 align-items-start">
                  <div className="bg-luxury-gold bg-opacity-10 p-2 rounded text-luxury-gold">
                    <i className="fas fa-map-marked-alt"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark">Alamat Lengkap</div>
                    <p className="small text-muted mb-0">{outletPublic.address}</p>
                  </div>
                </div>
                {waUrl && (
                  <div className="d-flex gap-3 align-items-start">
                    <div className="bg-luxury-gold bg-opacity-10 p-2 rounded text-luxury-gold">
                      <i className="fab fa-whatsapp"></i>
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Kontak</div>
                      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-luxury-gold fw-semibold small">
                        Hubungi via WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Services */}
          <div className="col-lg-8 animate-in delay-300 mt-lg-5 pt-lg-5">
            {/* Services Section */}
            <div className="d-flex align-items-center justify-content-between mb-4 mt-2 mt-lg-0">
              <h2 className="h4 fw-bold text-luxury-dark mb-0">
                Layanan Eksklusif
              </h2>
              <span className="text-muted small fst-italic">Standard kualitas terbaik</span>
            </div>

            {!hasServices ? (
              <div className="text-center py-5 text-muted glass-panel rounded-4">
                <i className="fas fa-spa fa-2x mb-3 text-luxury-gold opacity-50"></i>
                <p>Belum ada layanan yang ditampilkan saat ini.</p>
              </div>
            ) : (
              <div className="vstack gap-5">
                {serviceTypes.map((type) => (
                  <div key={type}>
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <span className="text-uppercase tracking-widest fw-bold text-luxury-gold small">{formatServiceType(type)}</span>
                      <div className="flex-grow-1 border-bottom border-luxury-gold opacity-25"></div>
                    </div>

                    <div className="row row-cols-1 row-cols-md-2 g-3">
                      {servicesByType[type].map((svc: any) => (
                        <div key={svc.id} className="col">
                          <div className="card h-100 border-0 shadow-luxury hover-lift transition-all rounded-3 overflow-hidden group">
                            <div className="card-body p-4 position-relative">
                              <div className="position-absolute top-0 end-0 p-3 opacity-5">
                                <i className="fas fa-tshirt fa-3x"></i>
                              </div>

                              <div className="d-flex flex-column h-100">
                                <h5 className="fw-bold text-dark mb-1">{svc.name}</h5>
                                <div className="mb-3">
                                  {svc.description && (
                                    <p className="text-muted small mb-0 line-clamp-2">
                                      {svc.description}
                                    </p>
                                  )}
                                </div>

                                <div className="mt-auto d-flex align-items-end justify-content-between">
                                  <div className="text-luxury-gold fw-bold fs-5">
                                    {formatCurrency(Number(svc.price) || 0)}
                                  </div>
                                  {svc.unit && (
                                    <span className="text-muted small bg-light px-2 py-1 rounded">
                                      / {svc.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="card-footer p-0 bg-luxury-gold" style={{ height: '3px', opacity: 0.8 }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-top py-5 mt-auto">
        <div className="container text-center">
          <div className="d-flex justify-content-center mb-3">
            <div className="bg-luxury-gold rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
              <i className="fas fa-store text-white"></i>
            </div>
          </div>
          <h5 className="fw-bold text-luxury-dark mb-1">{outletPublic.name}</h5>
          <p className="text-muted small mb-4">{outletPublic.address}</p>

          <div className="border-top w-25 mx-auto mb-4 border-luxury-gold opacity-25"></div>

          <p className="text-muted small mb-0">
            &copy; {new Date().getFullYear()} {outletPublic.name} <br />
            <span className="opacity-50">Powered by Kasirlondri System</span>
          </p>
        </div>
      </footer>

      {/* Floating WA Button (Mobile Only) */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success rounded-circle shadow-luxury position-fixed bottom-0 end-0 m-4 d-md-none z-3 d-flex align-items-center justify-content-center hover-scale"
          style={{ width: '60px', height: '60px' }}
          aria-label="Chat WhatsApp"
        >
          <i className="fab fa-whatsapp fa-2x"></i>
        </a>
      )}
    </div>
  );
}
