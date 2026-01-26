'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

type OwnedOutlet = {
  id: string;
  name: string;
  slug: string;
};

export function OwnerPublicBar(props: { slug: string }) {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const role = user?.role as string | undefined;
  const activeOutletId = (user?.outletId as string | null | undefined) ?? null;

  const [outletsLoading, setOutletsLoading] = useState(false);
  const [outlets, setOutlets] = useState<OwnedOutlet[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status !== 'authenticated') return;
      if (role !== 'OWNER') return;
      if (outletsLoading || outlets) return;

      setOutletsLoading(true);
      try {
        const res = await fetch('/api/dashboard/outlets', { method: 'GET' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || json?.error || 'Gagal memuat daftar outlet');
        }
        const list: OwnedOutlet[] = Array.isArray(json?.data)
          ? json.data.map((o: any) => ({
              id: String(o.id),
              name: String(o.name),
              slug: String(o.slug),
            }))
          : [];
        if (!cancelled) setOutlets(list);
      } catch {
        if (!cancelled) setOutlets([]);
      } finally {
        if (!cancelled) setOutletsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, role, outletsLoading, outlets]);

  const pageOutlet = useMemo(() => {
    if (!outlets) return null;
    return outlets.find((o) => o.slug === props.slug) ?? null;
  }, [outlets, props.slug]);

  const isActiveOutlet = Boolean(pageOutlet && activeOutletId && pageOutlet.id === activeOutletId);

  if (status !== 'authenticated' || role !== 'OWNER') return null;

  return (
    <div className="alert alert-info border d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="badge bg-info text-dark border">
          <i className="fas fa-user-shield me-1"></i>
          Mode Owner
        </span>
        {outletsLoading ? (
          <span className="text-muted small">Memuat info outlet...</span>
        ) : pageOutlet ? (
          isActiveOutlet ? (
            <span className="text-muted small">
              Outlet aktif: <span className="fw-semibold">{pageOutlet.name}</span>
            </span>
          ) : (
            <span className="text-muted small">
              Anda sedang melihat: <span className="fw-semibold">{pageOutlet.name}</span> (bukan outlet aktif)
            </span>
          )
        ) : (
          <span className="text-muted small">Outlet halaman ini tidak ditemukan di daftar outlet Anda.</span>
        )}
      </div>

      <div className="d-flex gap-2 flex-wrap">
        <Link href="/dashboard" className="btn btn-outline-info btn-sm">
          <i className="fas fa-tachometer-alt me-2"></i>
          Dashboard
        </Link>

        <Link
          href="/dashboard/settings/landing-page"
          className={`btn btn-info btn-sm ${isActiveOutlet ? '' : 'disabled'}`}
          aria-disabled={!isActiveOutlet}
          tabIndex={isActiveOutlet ? 0 : -1}
        >
          <i className="fas fa-edit me-2"></i>
          Edit Landing Page
        </Link>
      </div>
    </div>
  );
}

