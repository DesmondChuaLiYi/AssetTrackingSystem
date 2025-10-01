"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import MicrosoftLoginButton from "@/components/auth/MicrosoftLoginButton";
import Image from "next/image";
import { useRouter } from "next/navigation"; // Import useRouter

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter(); // Initialize useRouter

  // Redirect to /dashboard if authenticated
  if (isAuthenticated) {
    router.push("/dashboard"); // Programmatic navigation to /dashboard
    return null; // Return null while redirecting (prevents rendering)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              width={180}
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Asset Tracking System
          </h1>
          <p className="text-gray-600 text-sm">IT Asset Management</p>
        </div>

        {/* Microsoft Login */}
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Sign in with your organization account
            </p>
          </div>

          <MicrosoftLoginButton />

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secure authentication powered by Microsoft Azure AD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}