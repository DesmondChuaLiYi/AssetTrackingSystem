import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get session from HTTP-only cookie (no NextAuth verification needed)
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "No active session" },
        { status: 401 }
      );
    }

    try {
      const sessionData = JSON.parse(sessionCookie);
      return NextResponse.json({
        success: true,
        session: sessionData,
      });
    } catch (parseError) {
      console.error("Session cookie parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid session data" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}