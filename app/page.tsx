"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import MicrosoftLoginButton from "@/components/auth/MicrosoftLoginButton";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();
  const router = useRouter();
  const { session, startSession } = useSession();
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize session when user logs in with Microsoft
  useEffect(() => {
    const initializeSession = async () => {
      if (isAuthenticated && accounts.length > 0 && !session && !isInitializing) {
        setIsInitializing(true);

        const account = accounts[0];
        const microsoftUserId = account.localAccountId;

        try {
          // Fetch staff data from database
          const response = await fetch('/api/staff/get-by-microsoft-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ microsoftUserId })
          });

          const data = await response.json();

          if (data.success && data.staff) {
            // Create session with staff data
            await startSession(data.staff, microsoftUserId);
            router.push("/admin/dashboard");
          } else {
            // Staff not found - show error with Microsoft user ID
            console.warn('Staff not registered in database');
            console.log('Your Microsoft User ID:', microsoftUserId);
            alert(`Your account is not registered. Please contact administrator.\n\nYour Microsoft User ID:
          ${microsoftUserId}\n\n(Check browser console for details)`);

            // Log out from Microsoft to prevent infinite loop
            await instance.logoutPopup();

            setIsInitializing(false);
          }
        } catch (error) {
          console.error('Error initializing session:', error);
          setIsInitializing(false);
        }
      }
      // Note: Redirect for existing session is handled in the render logic below
    };

    initializeSession();
  }, [isAuthenticated, accounts, session, startSession, router, isInitializing]);

  // Show loading if authenticated but initializing session
  if (isAuthenticated && isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated with session
  if (isAuthenticated && session && !isInitializing) {
    router.replace("/admin/dashboard");
    return null;
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