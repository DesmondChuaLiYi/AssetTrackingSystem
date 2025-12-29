// app/layout.tsx
import type { Metadata } from "next";
import "./styles/globals.css";
import { NextAuthProvider } from "@/components/auth/nextAuthProvider";
import { SessionProvider } from "@/components/sessionProvider";
import { ToastProvider } from "@/components/ui/toast";
import LayoutWrapper from "@/components/layoutWrapper";

export const metadata: Metadata = {
  title: "Asset Tracking System",
  description: "IT Asset Tracking System with QR codes and barcodes",
  icons: {
    icon: '/favicon.ico'
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
        <NextAuthProvider>
          <SessionProvider>
            <ToastProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </ToastProvider>
          </SessionProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
