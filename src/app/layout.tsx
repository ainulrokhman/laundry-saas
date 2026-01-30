import type { Metadata } from "next";
import localFont from "next/font/local";
// Import CSS libraries (must be imported via JavaScript to avoid PostCSS parsing issues)
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "admin-lte/dist/css/adminlte.min.css";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

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
  openGraph: {
    title: "Kasirlondri",
    description:
      "Cari outlet laundry, lihat layanan & harga (jika tersedia), dan lacak pesanan Anda dengan tracking code.",
    url: "/",
    type: "website",
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
    <html lang="id" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased layout-fixed sidebar-expand-lg`}
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
