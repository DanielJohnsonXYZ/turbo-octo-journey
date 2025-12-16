import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// LinkedIn scraper without Proxycurl
// Uses multiple approaches:
// 1. Direct public profile fetch (when available)
// 2. Google search for LinkedIn activity
// 3. AI extraction from whatever content we can get

interface LinkedInProfile {
  name: string | null
  headline: string | null
  location: string | null
  about: string | null
  currentRole: string | null
  currentCompany: string | null
  profileUrl: string
  recentActivity: ActivityItem[]
  extractedTopics: string[]
}

interface ActivityItem {
  type: "post" | "article" | "share" | "comment" | "unknown"
  text: string
  date: string | null
  engagement: string | null
  url: string | null
}

// Try to fetch public LinkedIn profile
async function fetchPublicProfile(linkedinUrl: string): Promise<string | null> {
  try {
    // Clean up the URL
    let url = linkedinUrl
    if (!url.startsWith("http")) {
      url = `https://${url}`
    }

    // Ensure it's a linkedin.com URL
    if (!url.includes("linkedin.com")) {
      return null
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    })

    if (!response.ok) {
      console.log(`LinkedIn fetch failed with status: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Check if we got the actual profile or a login wall
    if (html.includes("auth_wall") || html.includes("sign-in") || html.includes("login")) {
      console.log("Hit LinkedIn auth wall")
      return null
    }

    return html
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error)
    return null
  }
}

// Search Google for LinkedIn activity
async function searchGoogleForLinkedIn(
  name: string,
  company?: string
): Promise<string[]> {
  try {
    // Build search query
    const query = company
      ? `site:linkedin.com "${name}" "${company}"`
      : `site:linkedin.com "${name}"`

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()

    // Extract LinkedIn URLs and snippets from search results
    const snippets: string[] = []

    // Look for LinkedIn-related content in the HTML
    // Google search results contain snippets in various elements
    const snippetRegex = /<span[^>]*>([^<]*linkedin[^<]*)<\/span>/gi
    const matches = html.matchAll(snippetRegex)

    for (const match of matches) {
      if (match[1] && match[1].length > 20) {
        snippets.push(match[1])
      }
    }

    // Also try to extract any visible text that mentions the person
    const textContentRegex = new RegExp(
      `[^<>]{0,100}${name.split(" ")[0]}[^<>]{0,200}`,
      "gi"
    )
    const textMatches = html.matchAll(textContentRegex)

    for (const match of textMatches) {
      if (match[0] && match[0].length > 30) {
        snippets.push(match[0])
      }
    }

    return [...new Set(snippets)].slice(0, 10)
  } catch (error) {
    console.error("Google search error:", error)
    return []
  }
}

// Extract structured data from LinkedIn HTML
function extractFromLinkedInHtml(html: string): Partial<LinkedInProfile> {
  const result: Partial<LinkedInProfile> = {}

  try {
    // Try to find JSON-LD data (most reliable)
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    )
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1])
        if (jsonData["@type"] === "Person") {
          result.name = jsonData.name
          result.headline = jsonData.jobTitle
          result.location = jsonData.address?.addressLocality
          result.about = jsonData.description
        }
      } catch {
        // JSON parse failed, continue with regex
      }
    }

    // Try meta tags
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)
    if (ogTitle) {
      result.name = ogTitle[1].split(" - ")[0].trim()
      result.headline = ogTitle[1].split(" - ")[1]?.trim()
    }

    const ogDescription = html.match(
      /<meta property="og:description" content="([^"]+)"/
    )
    if (ogDescription) {
      result.about = ogDescription[1]
    }

    // Try to extract headline from common patterns
    const headlineMatch = html.match(
      /class="[^"]*headline[^"]*"[^>]*>([^<]+)</i
    )
    if (headlineMatch) {
      result.headline = headlineMatch[1].trim()
    }

    // Try to extract location
    const locationMatch = html.match(
      /class="[^"]*location[^"]*"[^>]*>([^<]+)</i
    )
    if (locationMatch) {
      result.location = locationMatch[1].trim()
    }

    // Look for recent activity/posts
    const activityItems: ActivityItem[] = []

    // Look for post content
    const postMatches = html.matchAll(
      /class="[^"]*feed-shared-text[^"]*"[^>]*>([\s\S]{10,500}?)<\//gi
    )
    for (const match of postMatches) {
      activityItems.push({
        type: "post",
        text: match[1].replace(/<[^>]+>/g, "").trim().slice(0, 300),
        date: null,
        engagement: null,
        url: null,
      })
    }

    result.recentActivity = activityItems.slice(0, 5)
  } catch (error) {
    console.error("Error extracting from HTML:", error)
  }

  return result
}

// Use AI to extract insights from whatever content we gathered
async function aiExtractInsights(
  rawContent: string,
  name: string
): Promise<{ topics: string[]; summary: string }> {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Extract professional insights about "${name}" from this content. Return JSON with:
- topics: array of 3-5 professional topics/interests they seem focused on
- summary: 2-3 sentence summary of their recent professional focus

Content:
${rawContent.slice(0, 3000)}

Return only valid JSON, no other text.`,
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === "text")
    if (textContent && textContent.type === "text") {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
  } catch (error) {
    console.error("AI extraction error:", error)
  }

  return { topics: [], summary: "" }
}

export async function POST(request: NextRequest) {
  try {
    const { linkedin_url, name, company } = await request.json()

    if (!linkedin_url && !name) {
      return NextResponse.json(
        { success: false, error: "LinkedIn URL or name required" },
        { status: 400 }
      )
    }

    const result: LinkedInProfile = {
      name: name || null,
      headline: null,
      location: null,
      about: null,
      currentRole: null,
      currentCompany: company || null,
      profileUrl: linkedin_url || "",
      recentActivity: [],
      extractedTopics: [],
    }

    let rawContent = ""

    // Step 1: Try to fetch public profile directly
    if (linkedin_url) {
      const html = await fetchPublicProfile(linkedin_url)
      if (html) {
        rawContent += html
        const extracted = extractFromLinkedInHtml(html)
        Object.assign(result, extracted)
      }
    }

    // Step 2: Search Google for additional LinkedIn info
    if (name) {
      const searchResults = await searchGoogleForLinkedIn(name, company || undefined)
      if (searchResults.length > 0) {
        rawContent += "\n\n" + searchResults.join("\n")
      }
    }

    // Step 3: Use AI to extract insights from whatever we found
    if (rawContent.length > 100) {
      const aiInsights = await aiExtractInsights(rawContent, name || result.name || "this person")
      result.extractedTopics = aiInsights.topics
      if (!result.about && aiInsights.summary) {
        result.about = aiInsights.summary
      }
    }

    // Determine success based on what we found
    const hasData =
      result.headline ||
      result.about ||
      result.recentActivity.length > 0 ||
      result.extractedTopics.length > 0

    return NextResponse.json({
      success: true,
      data: result,
      dataQuality: hasData ? "partial" : "minimal",
      note: hasData
        ? "Some data extracted from public sources"
        : "Limited data available. LinkedIn restricts public access. Consider using Proxycurl for more reliable data.",
    })
  } catch (error) {
    console.error("LinkedIn scrape error:", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to scrape LinkedIn profile",
      },
      { status: 500 }
    )
  }
}
