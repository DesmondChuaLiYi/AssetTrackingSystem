// app/user/page.tsx
'use client';

import WelcomeContent from '@/components/scanner/welcomeContent';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function UserHome() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <WelcomeContent
      onNavigate={(type) => router.push(`/user/scanner?type=${type}`)}
    />
  );
}