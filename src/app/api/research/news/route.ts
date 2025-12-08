import { NextRequest, NextResponse } from "next/server"

interface NewsArticle {
  title: string
  description: string
  url: string
  source: { name: string }
  publishedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const { query, contactId } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 })
    }

    const newsApiKey = process.env.NEWSAPI_KEY
    if (!newsApiKey) {
      return NextResponse.json(
        { success: false, error: "NewsAPI key not configured" },
        { status: 500 }
      )
    }

    // Search for news about the person or their company
    const searchTerms = query.split(",").map((t: string) => t.trim()).filter(Boolean)
    const searchQuery = searchTerms.join(" OR ")

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&pageSize=10&language=en`,
      {
        headers: {
          "X-Api-Key": newsApiKey,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error("NewsAPI error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch news" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform to our research item format
    const researchItems = (data.articles || []).map((article: NewsArticle) => ({
      contact_id: contactId,
      source: "news" as const,
      source_name: article.source?.name || "Unknown",
      title: article.title,
      summary: article.description,
      url: article.url,
      importance_score: 5, // Default, can be AI-rated later
      is_read: false,
      fetched_at: new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        articles: researchItems,
        total: data.totalResults || 0,
      },
    })
  } catch (error) {
    console.error("News research error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch news" },
      { status: 500 }
    )
  }
}
