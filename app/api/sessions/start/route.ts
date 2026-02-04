import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST() {
  try {
    // Get authenticated user from NextAuth (trusted)
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const microsoftUserId = (session.user as any).microsoftUserId;

    // Lookup staff using server-trusted identity
    const { data: staff, error: staffError } = await supabase
      .from("Staff") // Staff table
      .select("*") // Select everything
      .eq("email", email) // Match email
      .single(); // Expect single result

    if (staffError || !staff) {
      console.error("Staff lookup failed:", staffError);
      return NextResponse.json(
        { success: false, error: "Staff not found" },
        { status: 403 }
      );
    }

    // Create session record (server-side only)
    const { data: dbSession, error: dbError } = await supabase
      .from("Sessions")
      .insert([
        {
          staff_id: staff.staff_id,
          microsoft_id: microsoftUserId,
          login_location: "Web App",
          status: "active",
          created_dt: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (dbError || !dbSession) {
      console.error("Session creation failed:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Return minimal safe data to client
    return NextResponse.json({
      success: true,
      session: {
        sessionId: dbSession.id,
        staffId: staff.staff_id,
        name: staff.name,
        email: staff.email,
        departmentId: staff.department_id,
        mobileNo: staff.mobile_no,
        microsoftUserId,
      },
    });
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}