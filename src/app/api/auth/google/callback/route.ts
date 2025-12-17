import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Google OAuth callback endpoint
// Exchanges authorization code for tokens and stores them

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  if (error) {
    console.error("Google OAuth error:", error)
    return NextResponse.redirect(`${baseUrl}/settings?google_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/settings?google_error=no_code`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/settings?google_error=not_configured`)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(`${baseUrl}/settings?google_error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Calculate token expiry
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in Supabase if configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Update the settings row with Google tokens
      const { error: updateError } = await supabase
        .from("settings")
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .not("id", "is", null) // Update all settings rows (should only be one)

      if (updateError) {
        console.error("Failed to store tokens in Supabase:", updateError)
        // Continue anyway - we'll pass tokens via URL for localStorage fallback
      }
    }

    // Redirect back to settings with success indicator
    // Include tokens in URL params for localStorage storage (encrypted in production)
    const successUrl = new URL(`${baseUrl}/settings`)
    successUrl.searchParams.set("google_connected", "true")

    // For localStorage fallback, pass tokens (only for development/demo purposes)
    // In production, tokens should only be stored server-side in Supabase
    if (!supabaseUrl) {
      successUrl.searchParams.set("google_access_token", tokens.access_token)
      if (tokens.refresh_token) {
        successUrl.searchParams.set("google_refresh_token", tokens.refresh_token)
      }
      successUrl.searchParams.set("google_token_expiry", expiryDate.toISOString())
    }

    return NextResponse.redirect(successUrl.toString())
  } catch (err) {
    console.error("OAuth callback error:", err)
    return NextResponse.redirect(`${baseUrl}/settings?google_error=callback_failed`)
  }
}
