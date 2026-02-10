import type { Metadata } from "next";
import localFont from "next/font/local";
// Import CSS libraries (must be imported via JavaScript to avoid PostCSS parsing issues)
// AdminLTE and bootstrap-icons are loaded only in dashboard/admin layouts to reduce render-blocking on landing
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { SWRegistration } from "@/components/pwa/SWRegistration";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Kasirlondri",
    template: "%s | Kasirlondri",
  },
  description:
    "Cari outlet laundry, lihat layanan & harga (jika tersedia), dan lacak pesanan Anda dengan tracking code.",
  keywords: [
    "kasir laundry",
    "manajemen laundry",
    "POS laundry",
    "aplikasi laundry",
    "sistem laundry",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kasirlondri",
    description:
      "Cari outlet laundry, lihat layanan & harga (jika tersedia), dan lacak pesanan Anda dengan tracking code.",
    url: "/",
    type: "website",
    locale: "id_ID",
    siteName: "Kasirlondri",
    images: [{ url: "/images/logo.png", width: 342, height: 112, alt: "Kasirlondri Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kasirlondri",
    description:
      "Cari outlet laundry, lihat layanan & harga (jika tersedia), dan lacak pesanan Anda dengan tracking code.",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" data-bs-theme="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased layout-fixed sidebar-expand-lg`}
      >
        <SessionProvider>
          <SWRegistration />
          {children}
          <SpeedInsights />
        </SessionProvider>
      </body>
    </html>
  );
}
