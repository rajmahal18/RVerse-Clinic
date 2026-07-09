import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Clinic",
  description: "Clinic records and inventory layout prototype",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/ocmlogo.png",
    shortcut: "/icons/ocmlogo.png",
    apple: "/icons/ocmlogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f9f95",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
