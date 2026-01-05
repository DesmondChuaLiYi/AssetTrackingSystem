import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextAuthProvider } from "@/components/auth/nextAuthProvider";
import { SessionProvider } from "@/components/auth/sessionProvider";
import LayoutWrapper from "@/components/layoutWrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <NextAuthProvider>
      <SessionProvider>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </SessionProvider>
    </NextAuthProvider>
  );
}