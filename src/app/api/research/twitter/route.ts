import { NextRequest, NextResponse } from "next/server"

// Twitter/X API v2 - Requires Bearer Token from developer.twitter.com
// Free tier: 1500 tweets/month read

export async function POST(request: NextRequest) {
  try {
    const { handle, contactId } = await request.json()

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Twitter handle is required" },
        { status: 400 }
      )
    }

    const bearerToken = process.env.TWITTER_BEARER_TOKEN
    if (!bearerToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Twitter API not configured. Add TWITTER_BEARER_TOKEN to environment variables.",
          setup_url: "https://developer.twitter.com/en/portal/dashboard",
        },
        { status: 400 }
      )
    }

    // Clean handle (remove @ if present)
    const cleanHandle = handle.replace(/^@/, "")

    // First, get user ID from handle
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanHandle}?user.fields=description,public_metrics,verified,profile_image_url`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    )

    if (!userResponse.ok) {
      const error = await userResponse.text()
      console.error("Twitter user lookup error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to find Twitter user" },
        { status: userResponse.status }
      )
    }

    const userData = await userResponse.json()
    const user = userData.data

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Twitter user not found" },
        { status: 404 }
      )
    }

    // Get recent tweets
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${user.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities&expansions=referenced_tweets.id`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      }
    )

    const tweetsData = await tweetsResponse.json()
    const tweets = tweetsData.data || []

    // Transform to research items
    const researchItems = tweets.map((tweet: {
      id: string
      text: string
      created_at: string
      public_metrics?: { like_count: number; retweet_count: number }
    }) => ({
      contact_id: contactId,
      source: "twitter" as const,
      source_name: `@${cleanHandle}`,
      title: tweet.text.slice(0, 100) + (tweet.text.length > 100 ? "..." : ""),
      summary: tweet.text,
      url: `https://twitter.com/${cleanHandle}/status/${tweet.id}`,
      importance_score: calculateTweetImportance(tweet),
      is_read: false,
      fetched_at: new Date().toISOString(),
    }))

    // Add profile info as a research item if meaningful
    if (user.description) {
      researchItems.unshift({
        contact_id: contactId,
        source: "twitter" as const,
        source_name: `@${cleanHandle}`,
        title: `Twitter Profile: ${user.name}`,
        summary: user.description,
        url: `https://twitter.com/${cleanHandle}`,
        importance_score: 5,
        is_read: false,
        fetched_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          handle: cleanHandle,
          name: user.name,
          description: user.description,
          followers: user.public_metrics?.followers_count,
          verified: user.verified,
        },
        items: researchItems,
      },
    })
  } catch (error) {
    console.error("Twitter research error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch Twitter data" },
      { status: 500 }
    )
  }
}

function calculateTweetImportance(tweet: {
  public_metrics?: { like_count: number; retweet_count: number }
  text: string
}): number {
  let score = 5 // Base score

  // Engagement boost
  const likes = tweet.public_metrics?.like_count || 0
  const retweets = tweet.public_metrics?.retweet_count || 0
  if (likes + retweets > 100) score += 2
  if (likes + retweets > 1000) score += 2

  // Content signals
  const text = tweet.text.toLowerCase()
  if (text.includes("announce") || text.includes("launching") || text.includes("excited")) score += 1
  if (text.includes("hiring") || text.includes("join us")) score += 1
  if (text.includes("raised") || text.includes("funding") || text.includes("series")) score += 2

  return Math.min(score, 10)
}
