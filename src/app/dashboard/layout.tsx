/**
 * Dashboard Layout
 * 
 * Wraps all dashboard pages with AdminLTE layout
 */

import "admin-lte/dist/css/adminlte.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
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
