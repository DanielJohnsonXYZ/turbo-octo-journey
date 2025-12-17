import { NextRequest, NextResponse } from "next/server"

// Google OAuth initiation endpoint
// Redirects user to Google's OAuth consent screen

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment variables." },
      { status: 500 }
    )
  }

  if (!redirectUri) {
    return NextResponse.json(
      { error: "Redirect URI not configured. Set GOOGLE_REDIRECT_URI or NEXT_PUBLIC_APP_URL." },
      { status: 500 }
    )
  }

  // Build Google OAuth URL
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
  ]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline", // Get refresh token
    prompt: "consent", // Always show consent to get refresh token
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
