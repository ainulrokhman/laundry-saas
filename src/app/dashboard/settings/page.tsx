import { redirect } from 'next/navigation';
import { Role } from '@/generated/prisma';
import { auth } from '@/lib/auth';

export default async function SettingsIndexRedirectPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = session.user as any;
  const userRole = user?.role as Role | undefined;

  // Only OWNER and STAFF can access settings
  if (userRole !== Role.OWNER && userRole !== Role.STAFF) {
    redirect('/dashboard');
  }

  // Halaman index settings dihapus; arahkan ke pengaturan yang paling aman untuk semua role.
  redirect('/dashboard/settings/change-pin');
}
