import { NextRequest, NextResponse } from "next/server"

// LinkedIn Posts/Activity scraping via Proxycurl
// Fetches recent posts and activity from a LinkedIn profile

interface LinkedInPost {
  id: string
  text: string
  postedAt: string | null
  numLikes: number
  numComments: number
  numShares: number
  postUrl: string | null
  images: string[]
  isRepost: boolean
}

interface LinkedInActivity {
  recentPosts: LinkedInPost[]
  totalActivityCount: number
  mostEngagedPost: LinkedInPost | null
  postingFrequency: string // "active", "moderate", "infrequent"
  topTopics: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { linkedin_url } = await request.json()

    if (!linkedin_url) {
      return NextResponse.json(
        { success: false, error: "LinkedIn URL required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.PROXYCURL_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Proxycurl API key not configured" },
        { status: 500 }
      )
    }

    // Fetch profile with activities using Proxycurl
    // The personal_contact_number and personal_email cost extra, so we skip those
    const profileUrl = new URL("https://nubela.co/proxycurl/api/v2/linkedin")
    profileUrl.searchParams.set("linkedin_profile_url", linkedin_url)
    profileUrl.searchParams.set("use_cache", "if-recent") // Use cache if less than 29 days old
    profileUrl.searchParams.set("fallback_to_cache", "on-error")

    const profileResponse = await fetch(profileUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!profileResponse.ok) {
      const error = await profileResponse.text()
      console.error("Proxycurl profile error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch LinkedIn profile" },
        { status: profileResponse.status }
      )
    }

    const profile = await profileResponse.json()

    // Fetch posts separately using the posts endpoint
    const postsUrl = new URL("https://nubela.co/proxycurl/api/v2/linkedin/profile/posts")
    postsUrl.searchParams.set("linkedin_profile_url", linkedin_url)

    const postsResponse = await fetch(postsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    let posts: LinkedInPost[] = []

    if (postsResponse.ok) {
      const postsData = await postsResponse.json()

      posts = (postsData.posts || []).slice(0, 10).map((post: any) => ({
        id: post.post_url || Math.random().toString(),
        text: post.text || "",
        postedAt: post.posted_at || null,
        numLikes: post.num_likes || 0,
        numComments: post.num_comments || 0,
        numShares: post.num_shares || 0,
        postUrl: post.post_url || null,
        images: post.images || [],
        isRepost: post.is_repost || false,
      }))
    }

    // Analyze posting frequency
    let postingFrequency = "unknown"
    if (posts.length > 0) {
      const postsWithDates = posts.filter((p) => p.postedAt)
      if (postsWithDates.length >= 5) {
        // Check if 5+ posts in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentPosts = postsWithDates.filter(
          (p) => new Date(p.postedAt!) > thirtyDaysAgo
        )
        if (recentPosts.length >= 5) {
          postingFrequency = "active"
        } else if (recentPosts.length >= 2) {
          postingFrequency = "moderate"
        } else {
          postingFrequency = "infrequent"
        }
      }
    }

    // Find most engaged post
    const mostEngagedPost = posts.length > 0
      ? posts.reduce((max, post) => {
          const engagement = post.numLikes + post.numComments * 2 + post.numShares * 3
          const maxEngagement = max.numLikes + max.numComments * 2 + max.numShares * 3
          return engagement > maxEngagement ? post : max
        })
      : null

    // Extract topics from posts (simple keyword extraction)
    const topTopics = extractTopics(posts.map((p) => p.text).join(" "))

    const result: LinkedInActivity = {
      recentPosts: posts,
      totalActivityCount: posts.length,
      mostEngagedPost,
      postingFrequency,
      topTopics,
    }

    return NextResponse.json({
      success: true,
      data: result,
      profile: {
        headline: profile.headline,
        summary: profile.summary,
        occupation: profile.occupation,
        experiences: (profile.experiences || []).slice(0, 3).map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          startDate: exp.starts_at,
          endDate: exp.ends_at,
          isCurrent: !exp.ends_at,
        })),
      },
    })
  } catch (error) {
    console.error("LinkedIn posts error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch LinkedIn posts" },
      { status: 500 }
    )
  }
}

function extractTopics(text: string): string[] {
  // Simple topic extraction - looks for common business/tech keywords
  const keywords = [
    "AI", "startup", "funding", "product", "launch", "hiring", "team",
    "growth", "revenue", "customers", "investors", "fundraising", "series",
    "partnership", "announcement", "milestone", "leadership", "strategy",
    "innovation", "technology", "market", "sales", "marketing", "engineering",
    "design", "culture", "remote", "hybrid", "IPO", "acquisition", "exit",
  ]

  const textLower = text.toLowerCase()
  const found = keywords.filter((keyword) =>
    textLower.includes(keyword.toLowerCase())
  )

  // Return top 5 unique topics
  return [...new Set(found)].slice(0, 5)
}
