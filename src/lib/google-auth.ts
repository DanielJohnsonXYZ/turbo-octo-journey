import { createClient } from "@supabase/supabase-js"

interface GoogleTokens {
  access_token: string
  refresh_token: string | null
  expiry: Date | null
}

// Get Google tokens from Supabase
export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from("settings")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .limit(1)
    .single()

  if (error || !data?.google_access_token) {
    return null
  }

  return {
    access_token: data.google_access_token,
    refresh_token: data.google_refresh_token,
    expiry: data.google_token_expiry ? new Date(data.google_token_expiry) : null,
  }
}

// Refresh Google access token using refresh token
export async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials not configured")
    return null
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Token refresh failed:", error)
      return null
    }

    const tokens = await response.json()

    // Update stored tokens in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const expiryDate = new Date(Date.now() + tokens.expires_in * 1000)

      await supabase
        .from("settings")
        .update({
          google_access_token: tokens.access_token,
          google_token_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .not("id", "is", null)
    }

    return tokens.access_token
  } catch (err) {
    console.error("Token refresh error:", err)
    return null
  }
}

// Get a valid access token, refreshing if necessary
export async function getValidGoogleToken(): Promise<string | null> {
  const tokens = await getGoogleTokens()

  if (!tokens) {
    return null
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = tokens.expiry && tokens.expiry.getTime() < Date.now() + 5 * 60 * 1000

  if (isExpired && tokens.refresh_token) {
    return await refreshGoogleToken(tokens.refresh_token)
  }

  return tokens.access_token
}

// Check if Google Calendar is connected
export async function isGoogleCalendarConnected(): Promise<boolean> {
  const tokens = await getGoogleTokens()
  return tokens !== null && tokens.access_token !== null
}
