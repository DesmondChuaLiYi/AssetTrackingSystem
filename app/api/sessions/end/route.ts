// app/api/sessions/end/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie if it exists (don't require auth)
    const sessionCookie = request.cookies.get("session")?.value;

    // Try to update DB if we have session data
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie);
        if (sessionData.sessionId) {
          await supabase
            .from("Sessions")
            .update({
              status: "ended",
              ended_at: new Date().toISOString(),
            })
            .eq("id", sessionData.sessionId);
        }
      } catch (parseError) {
        // Ignore parse errors - just clear the cookie
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the session cookie
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Still return success and clear cookie even on error
    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    });

    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}