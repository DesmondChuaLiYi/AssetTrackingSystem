// Root layout for the application which includes metadata and global styles
import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Asset Tracking System",
  description: "Swinburne Asset Tracking System for staff and IT department",
  icons: {
    icon: '/favicon.ico'
  },
  referrer: 'strict-origin-when-cross-origin',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black">
        <NextAuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
