import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

// Web Scraping with AI Summary
// Fetches a webpage and uses Claude to extract relevant information

export async function POST(request: NextRequest) {
  try {
    const { url, contactId, contactName } = await request.json()

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      )
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RelationshipOS/1.0; +https://relationshipos.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch webpage" },
        { status: response.status }
      )
    }

    const html = await response.text()

    // Extract text content (basic HTML to text)
    const textContent = extractTextFromHtml(html)
    const title = extractTitle(html)
    const description = extractMetaDescription(html)
    const ogImage = extractOgImage(html)

    // If we have Claude API key, get AI summary
    let aiSummary = description
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (anthropicKey && textContent.length > 100) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey })

        const summaryResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Summarize this webpage content in 2-3 sentences, focusing on information that would be relevant for maintaining a professional relationship with ${contactName || "this person"}. Extract any news, updates, achievements, or talking points.

Title: ${title}
Content: ${textContent.slice(0, 4000)}`,
            },
          ],
        })

        const textBlock = summaryResponse.content.find((c) => c.type === "text")
        if (textBlock && textBlock.type === "text") {
          aiSummary = textBlock.text
        }
      } catch (aiError) {
        console.error("AI summary error:", aiError)
        // Fall back to meta description
      }
    }

    const researchItem = {
      contact_id: contactId,
      source: "web" as const,
      source_name: new URL(url).hostname,
      title: title || url,
      summary: aiSummary || description || textContent.slice(0, 300),
      url: url,
      image_url: ogImage || null,
      importance_score: 5,
      is_read: false,
      fetched_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: {
        item: researchItem,
        meta: {
          title,
          description,
          content_length: textContent.length,
        },
      },
    })
  } catch (error) {
    console.error("Web scrape error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to scrape webpage" },
      { status: 500 }
    )
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ")

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim()

  return text
}

function extractTitle(html: string): string | null {
  // Try og:title first
  const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1]

  // Try title tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()

  return null
}

function extractMetaDescription(html: string): string | null {
  // Try og:description first
  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1]

  // Try meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (metaMatch) return metaMatch[1]

  return null
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
  return match ? match[1] : null
}
