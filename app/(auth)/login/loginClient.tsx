"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useToast } from '@/components/ui/toast';

export default function LoginClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const hasInitialized = useRef(false);

  // Initialize session after successful Microsoft login
  useEffect(() => {
    if (hasInitialized.current) return;
    
    if (status === 'authenticated' && session?.user) {
      hasInitialized.current = true;
      initializeAppSession();
    }
  }, [status, session]);

  const initializeAppSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/staff/get-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          microsoftUserId: session?.user?.microsoftUserId
        }),
      });

      const data = await response.json();

      if (data.success && data.staff) {
        // Fetch role from server-side session, don't trust client
        const sessionResponse = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: data.staff.id,
            email: data.staff.email,
          }),
        });

        const sessionData = await sessionResponse.json();
        
        if (sessionData.success && sessionData.redirectUrl) {
          showToast('Login successful!', 'success');
          setTimeout(() => {
            router.push(sessionData.redirectUrl);
          }, 5000);
        } else {
          throw new Error('Session initialization failed');
        }
      } else {
        showToast(data.error || 'Login failed', 'error');
        hasInitialized.current = false;
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('An error occurred during login', 'error');
      hasInitialized.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo-long-full.svg"
              alt="Swinburne University of Technology"
              className="h-15 w-auto"
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
              Sign in with your organisation account
            </p>
          </div>

          <button
            onClick={() => signIn('azure-ad')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0H0V10H10V0Z" fill="#F25022" />
              <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
              <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
              <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
            </svg>
            {isLoading ? 'Loading...' : 'Sign in with Microsoft'}
          </button>

          {/* Registration Link */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">
              Register and wait for account approval from the admin
            </p>
            <a
              href="/register"
              className="block w-full text-center px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
            >
              Register for Access
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}