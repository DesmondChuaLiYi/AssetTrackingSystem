import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./loginClient";

export const metadata = {
  title: "Sign In - Asset Tracking System",
};

export default async function LoginPage() {
  // If already authenticated, redirect to the correct role-based dashboard
  const session = await getServerSession(authOptions);

  if (session) {
    const role = (session.user as any)?.role;
    // Only redirect approved users — pending/rejected stay on the login page to see the warning toast
    if (role === 'admin') redirect('/admin/dashboard');
    if (role === 'staff') redirect('/user/dashboard');
  }

  return <LoginClient />;
}