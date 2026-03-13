// Root layout for the application which includes metadata and global styles
import type { Metadata } from "next";
import "./globals.css";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { ToastProvider } from "../components/ui/toast";

// Contain the metadata for the application
export const metadata: Metadata = {
  title: "Asset Tracking System",
  description: "Swinburne Asset Tracking System for staff and IT department",
  icons: {
    icon: '/favicon.ico'
  }
  // Security policies are in next.config.js
};

// Root layout component that wraps the entire application
export default function RootLayout({
  children, // The child components (page) to be rendered within this layout
}: {
  children: React.ReactNode; // 
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-black"> {/* Global styles for body */}
        <NextAuthProvider> {/* Provides authentication context to the app */}
          <ToastProvider> {/* Provides toast notification (such as Login successful!) */}
            {children} {/* Render the child components here */}
          </ToastProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}