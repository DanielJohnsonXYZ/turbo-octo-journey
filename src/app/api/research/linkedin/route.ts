import { NextRequest, NextResponse } from "next/server"

interface ProxycurlProfile {
  full_name: string
  headline: string
  summary: string
  occupation: string
  city: string
  country: string
  experiences: Array<{
    title: string
    company: string
    starts_at: { year: number; month: number } | null
    ends_at: { year: number; month: number } | null
    description: string | null
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { linkedinUrl, contactId } = await request.json()

    if (!linkedinUrl) {
      return NextResponse.json({ success: false, error: "LinkedIn URL is required" }, { status: 400 })
    }

    const proxycurlKey = process.env.PROXYCURL_API_KEY
    if (!proxycurlKey || proxycurlKey === "your_proxycurl_key") {
      return NextResponse.json(
        {
          success: false,
          error: "Proxycurl API key not configured. Sign up at proxycurl.com to enable LinkedIn monitoring."
        },
        { status: 400 }
      )
    }

    // Fetch LinkedIn profile data
    const response = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
      {
        headers: {
          Authorization: `Bearer ${proxycurlKey}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error("Proxycurl error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch LinkedIn profile" },
        { status: response.status }
      )
    }

    const profile: ProxycurlProfile = await response.json()

    // Extract meaningful updates
    const researchItems = []

    // Current role
    if (profile.headline || profile.occupation) {
      researchItems.push({
        contact_id: contactId,
        source: "linkedin" as const,
        source_name: "LinkedIn",
        title: `Current Role: ${profile.headline || profile.occupation}`,
        summary: profile.summary?.slice(0, 500) || null,
        url: linkedinUrl,
        importance_score: 7,
        is_read: false,
        fetched_at: new Date().toISOString(),
      })
    }

    // Recent job changes (within last year)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    if (profile.experiences && profile.experiences.length > 0) {
      const recentExperiences = profile.experiences.filter((exp) => {
        if (!exp.starts_at) return false
        const startDate = new Date(exp.starts_at.year, (exp.starts_at.month || 1) - 1)
        return startDate >= oneYearAgo
      })

      for (const exp of recentExperiences) {
        researchItems.push({
          contact_id: contactId,
          source: "linkedin" as const,
          source_name: "LinkedIn",
          title: `New Role: ${exp.title} at ${exp.company}`,
          summary: exp.description?.slice(0, 300) || `Started ${exp.starts_at?.month}/${exp.starts_at?.year}`,
          url: linkedinUrl,
          importance_score: 9, // Job changes are high importance
          is_read: false,
          fetched_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          name: profile.full_name,
          headline: profile.headline,
          location: profile.city ? `${profile.city}, ${profile.country}` : profile.country,
        },
        research_items: researchItems,
      },
    })
  } catch (error) {
    console.error("LinkedIn research error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch LinkedIn data" },
      { status: 500 }
    )
  }
}
