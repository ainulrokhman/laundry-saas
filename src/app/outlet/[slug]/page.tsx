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
    <div className="bg-light">
      <div className="container py-4 py-md-5">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            <OwnerPublicBar slug={slug} />
            {/* Hero */}
            <div className="card shadow-sm border-0 overflow-hidden">
              <div className="position-relative">
                {hasCover ? (
                  <div className="ratio ratio-21x9 bg-dark">
                    <img
                      src={outletPublic.coverUrl as string}
                      alt={`Foto cover ${outletPublic.name}`}
                      className="w-100 h-100 object-fit-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="bg-dark text-white">
                    <div className="p-4 p-md-5">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-white bg-opacity-10 rounded p-3">
                          <i className="fas fa-store fa-2x"></i>
                        </div>
                        <div>
                          <div className="small text-white-50">Outlet</div>
                          <div className="h4 mb-0">{outletPublic.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {hasCover && (
                  <>
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
                    <div className="position-absolute bottom-0 start-0 w-100 p-3 p-md-4">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-3">
                          {hasLogo ? (
                            <div className="bg-white rounded shadow-sm p-1">
                              <img
                                src={outletPublic.logoUrl as string}
                                alt={`Logo ${outletPublic.name}`}
                                className="rounded object-fit-cover"
                                width={56}
                                height={56}
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="bg-white bg-opacity-25 rounded p-3">
                              <i className="fas fa-store text-white"></i>
                            </div>
                          )}

                          <div className="text-white">
                            <h1 className="h4 mb-1">{outletPublic.name}</h1>
                            {heroTagline && (
                              <div className="small text-white-50">{heroTagline}</div>
                            )}
                            <div className="text-white-50">
                              <i className="fas fa-map-marker-alt me-2"></i>
                              {outletPublic.address}
                            </div>
                            {heroLead && (
                              <div className="mt-2 text-white-50">{heroLead}</div>
                            )}
                          </div>
                        </div>

                        <div className="d-flex gap-2 flex-wrap">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-light"
                          >
                            <i className="fas fa-map-marked-alt me-2"></i>
                            Buka Maps
                          </a>

                          <a href="#track-order" className="btn btn-primary">
                            <i className="fas fa-search me-2"></i>
                            Lacak Pesanan
                          </a>

                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-success d-none d-md-inline-flex"
                            >
                              <i className="fab fa-whatsapp me-2"></i>
                              Chat WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!hasCover && (
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                      {hasLogo && (
                        <div className="bg-white rounded shadow-sm p-1 border">
                          <img
                            src={outletPublic.logoUrl as string}
                            alt={`Logo ${outletPublic.name}`}
                            className="rounded object-fit-cover"
                            width={56}
                            height={56}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div>
                        <h1 className="h4 mb-1">{outletPublic.name}</h1>
                        {heroTagline && (
                          <div className="small text-muted">{heroTagline}</div>
                        )}
                        <div className="text-muted">
                          <i className="fas fa-map-marker-alt me-2"></i>
                          {outletPublic.address}
                        </div>
                        {heroLead && (
                          <div className="text-muted small mt-2">{heroLead}</div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary"
                      >
                        <i className="fas fa-map-marked-alt me-2"></i>
                        Buka Maps
                      </a>
                      <a href="#track-order" className="btn btn-primary">
                        <i className="fas fa-search me-2"></i>
                        Lacak Pesanan
                      </a>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-success"
                        >
                          <i className="fab fa-whatsapp me-2"></i>
                          Chat WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating CTA (mobile) */}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success position-fixed bottom-0 end-0 m-3 shadow d-md-none z-3"
                aria-label="Chat WhatsApp"
              >
                <i className="fab fa-whatsapp me-2"></i>
                Chat
              </a>
            )}

            <div className="row g-3 mt-1">
              <div className="col-md-7">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <h2 className="h6 mb-0">
                        <i className="fas fa-info-circle me-2 text-info"></i>
                        Tentang Outlet
                      </h2>
                      <span className="badge bg-light text-muted border">
                        <i className="fas fa-shield-alt me-1"></i>
                        Data sesuai yang tersedia
                      </span>
                    </div>

                    {hasDescription ? (
                      <p className="mb-0">{outletPublic.description}</p>
                    ) : (
                      <div className="alert alert-light border mb-0">
                        <span className="text-muted">Belum ada deskripsi outlet yang ditampilkan.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-5">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h2 className="h6 mb-2">
                      <i className="fas fa-clock me-2 text-warning"></i>
                      Jam Operasional
                    </h2>
                    {hasBusinessHours ? (
                      <div className="alert alert-light border mb-0">{outletPublic.businessHours}</div>
                    ) : (
                      <div className="alert alert-light border mb-0">
                        <span className="text-muted">Belum ada jam operasional yang ditampilkan.</span>
                      </div>
                    )}

                    <hr className="my-3" />

                    <h2 className="h6 mb-2">
                      <i className="fas fa-map-marked-alt me-2 text-danger"></i>
                      Lokasi
                    </h2>
                    <div className="text-muted small mb-2">{outletPublic.address}</div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-secondary btn-sm"
                    >
                      <i className="fas fa-directions me-2"></i>
                      Petunjuk Arah
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3" id="track-order">
              <TrackOrderInline slug={slug} />
            </div>

            {/* Services */}
            <div className="card shadow-sm mt-3">
              <div className="card-header bg-white">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h2 className="h6 mb-0">
                    <i className="fas fa-concierge-bell me-2 text-primary"></i>
                    Daftar Layanan & Harga
                  </h2>
                  <div className="text-muted small">
                    <i className="fas fa-info-circle me-1"></i>
                    Ditampilkan hanya jika tersedia
                  </div>
                </div>
              </div>
              <div className="card-body">
                {!hasServices ? (
                  <div className="alert alert-light border mb-0">
                    <span className="text-muted">Belum ada layanan yang ditampilkan.</span>
                  </div>
                ) : (
                  <div className="vstack gap-4">
                    {serviceTypes.map((type) => (
                      <div key={type}>
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                          <div className="fw-semibold">
                            {formatServiceType(type)}
                          </div>
                          <span className="badge bg-secondary">
                            {servicesByType[type].length} item
                          </span>
                        </div>

                        <div className="row g-3">
                          {servicesByType[type].map((svc: any) => (
                            <div key={svc.id} className="col-md-6">
                              <div className="card h-100 border">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-start gap-3">
                                    <div className="flex-grow-1">
                                      <div className="fw-semibold">{svc.name}</div>
                                      {svc.description && (
                                        <div className="text-muted small mt-1">{svc.description}</div>
                                      )}
                                      {svc.unit && (
                                        <div className="mt-2">
                                          <span className="badge bg-light text-muted border">
                                            Satuan: {svc.unit}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-end">
                                      <div className="fw-bold text-primary">
                                        {formatCurrency(Number(svc.price) || 0)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card-footer bg-white d-flex justify-content-between flex-wrap gap-2">
                <Link href="/" className="btn btn-outline-secondary">
                  <i className="fas fa-arrow-left me-2"></i>
                  Kembali
                </Link>
                <div className="text-muted small">
                  <i className="fas fa-link me-1"></i>
                  URL outlet: <span className="fw-semibold">/outlet/{outletPublic.slug}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-muted small mt-3">
              Halaman ini menampilkan informasi outlet yang tersedia saat ini (tanpa klaim berlebihan).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

