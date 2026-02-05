import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masuk',
  description: 'Masuk ke dashboard Kasirlondri dengan nomor telepon dan PIN.',
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
