import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daftar',
  description: 'Daftar akun Kasirlondri dan kelola bisnis laundry Anda.',
  robots: { index: false, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
