import { NextResponse } from "next/server"
import { getGoogleTokens } from "@/lib/google-auth"

export async function GET() {
  try {
    const tokens = await getGoogleTokens()

    if (tokens && tokens.access_token) {
      // Verify token is still valid by making a test request
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      )

      if (response.ok) {
        return NextResponse.json({ connected: true })
      }

      // Token might be expired, but we have refresh token
      if (tokens.refresh_token) {
        return NextResponse.json({ connected: true, needsRefresh: true })
      }
    }

    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error("Error checking Google status:", error)
    return NextResponse.json({ connected: false, error: "Failed to check status" })
  }
}
