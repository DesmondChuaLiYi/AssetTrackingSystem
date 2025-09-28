import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Tracking System",
  description: "IT Asset Tracking System with QR codes and barcodes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}