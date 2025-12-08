import { NextRequest, NextResponse } from "next/server"

// RSS Feed Parser - for blogs, company news, etc.
// No API key required - works with any public RSS feed

export async function POST(request: NextRequest) {
  try {
    const { feedUrl, contactId } = await request.json()

    if (!feedUrl) {
      return NextResponse.json(
        { success: false, error: "Feed URL is required" },
        { status: 400 }
      )
    }

    // Fetch the RSS feed
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "RelationshipOS/1.0 (RSS Reader)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch RSS feed" },
        { status: response.status }
      )
    }

    const xml = await response.text()

    // Parse RSS/Atom feed
    const items = parseRSSFeed(xml)

    // Transform to research items
    const researchItems = items.slice(0, 10).map((item) => ({
      contact_id: contactId,
      source: "rss" as const,
      source_name: item.source || new URL(feedUrl).hostname,
      title: item.title,
      summary: item.description?.slice(0, 500) || null,
      url: item.link,
      image_url: item.image || null,
      importance_score: 5,
      is_read: false,
      fetched_at: new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        feed_title: extractFeedTitle(xml),
        items: researchItems,
      },
    })
  } catch (error) {
    console.error("RSS research error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse RSS feed" },
      { status: 500 }
    )
  }
}

interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  source?: string
  image?: string
}

function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = []

  // Try RSS 2.0 format first
  const rssItemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)
  for (const match of rssItemMatches) {
    const itemXml = match[1]
    items.push({
      title: extractTag(itemXml, "title") || "Untitled",
      link: extractTag(itemXml, "link") || extractTag(itemXml, "guid") || "",
      description: extractTag(itemXml, "description") || extractTag(itemXml, "content:encoded"),
      pubDate: extractTag(itemXml, "pubDate"),
      image: extractMediaImage(itemXml),
    })
  }

  // If no RSS items, try Atom format
  if (items.length === 0) {
    const atomEntryMatches = xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)
    for (const match of atomEntryMatches) {
      const entryXml = match[1]
      items.push({
        title: extractTag(entryXml, "title") || "Untitled",
        link: extractAtomLink(entryXml) || "",
        description: extractTag(entryXml, "summary") || extractTag(entryXml, "content"),
        pubDate: extractTag(entryXml, "published") || extractTag(entryXml, "updated"),
      })
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | undefined {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"))
  if (cdataMatch) return cleanHtml(cdataMatch[1])

  // Handle regular content
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  if (match) return cleanHtml(match[1])

  return undefined
}

function extractAtomLink(xml: string): string | undefined {
  // Look for link with rel="alternate" or no rel
  const linkMatch = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)
  return linkMatch?.[1]
}

function extractMediaImage(xml: string): string | undefined {
  // Try media:content
  const mediaMatch = xml.match(/<media:content[^>]*url=["']([^"']+)["']/i)
  if (mediaMatch) return mediaMatch[1]

  // Try enclosure
  const enclosureMatch = xml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i)
  if (enclosureMatch) return enclosureMatch[1]

  return undefined
}

function extractFeedTitle(xml: string): string {
  const match = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
  return match ? cleanHtml(match[1]) : "RSS Feed"
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
}
