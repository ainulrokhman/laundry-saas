/**
 * Admin Layout
 * 
 * Wraps all admin pages with AdminLTE layout
 * Same as dashboard layout but for admin routes
 */

import { DashboardLayout } from '@/components/adminlte/DashboardLayout';
import { AdminLTEProvider } from '@/components/adminlte/AdminLTEProvider';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLTEProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AdminLTEProvider>
  );
}
