// app/user/page.tsx
'use client';

import WelcomeContent from '@/components/scanner/WelcomeContent';
import { useRouter } from 'next/navigation';

export default function UserHome() {
  const router = useRouter();

  return (
    <WelcomeContent
      onNavigate={(type) => router.push(`/user/scanner?type=${type}`)}
    />
  );
}