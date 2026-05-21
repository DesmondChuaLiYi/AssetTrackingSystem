// Commented by Desmond @ 21-May-26: Removed unnecessary session checking because it is already being
// handled by the middleware.

// import { getServerSession } from "next-auth";
// import { redirect } from "next/navigation";
import LayoutWrapper from "@/components/layoutWrapper"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // // Server-side auth check
  // const session = await getServerSession();

  // if (!session) {
  //   redirect("/login");
  // }

  return (
    <LayoutWrapper>
      {children}
    </LayoutWrapper>
  )
}