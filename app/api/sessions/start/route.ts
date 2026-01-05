import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Verify NextAuth session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    let requestBody;
    try {
      const text = await request.text();
      if (!text.trim()) {
        return NextResponse.json(
          { success: false, error: "Request body is empty" },
          { status: 400 }
        );
      }
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { staffId, email, microsoftUserId } = requestBody;

    // Validate required fields
    if (!staffId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: staffId, email" },
        { status: 400 }
      );
    }

    // Fetch staff from Supabase to get role and details
    const { data: staffMember, error: staffError } = await supabase
      .from("Staff")
      .select("*")
      .eq("id", staffId)
      .single();

    if (staffError || !staffMember) {
      console.error("Staff fetch error:", staffError);
      return NextResponse.json(
        { success: false, error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Create session record in database
    const { data: dbSession, error: dbError } = await supabase
      .from("Sessions")
      .insert([
        {
          staff_id: staffId,
          microsoft_id: microsoftUserId,
          login_location: "Web App",
          status: "active",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Error creating session in database:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Determine redirect based on role (SERVER-SIDE)
    const redirectUrl =
      staffMember.role === "admin"
        ? "/admin/dashboard"
        : "/user/dashboard";

    // Session data to store in HTTP-only cookie
    const sessionData = {
      sessionId: dbSession.id,
      staffId: staffMember.id,
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      departmentId: staffMember.department_id || null,
      mobileNo: staffMember.mobile_no || null,
      microsoftUserId,
      createdAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      session: sessionData,
      redirectUrl,
    });

    // Set HTTP-only, Secure, SameSite cookie (NOT accessible by JavaScript)
    response.cookies.set("session", JSON.stringify(sessionData), {
      httpOnly: true, // XSS protection - cannot be accessed by JS
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}