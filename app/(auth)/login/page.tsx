import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginClient from "./loginClient";

export const metadata = {
  title: "Sign In - Asset Tracking System",
};

export default async function LoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await getServerSession();
  
  if (session) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}