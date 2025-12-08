import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Contact, ResearchItem, Interaction } from "@/lib/types"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface PrioritizeRequest {
  contacts: Contact[]
  research_map: Record<string, ResearchItem[]>
  interaction_map: Record<string, Interaction[]>
  settings: {
    high_priority_frequency_days: number
    medium_priority_frequency_days: number
    low_priority_frequency_days: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PrioritizeRequest = await request.json()
    const { contacts, research_map, interaction_map, settings } = body

    // Filter to non-archived contacts that we should contact
    const activeContacts = contacts.filter(
      (c) => !c.is_archived && !c.dont_need_to_contact
    )

    // Build context for each contact
    const contactContexts = activeContacts.map((contact) => {
      const research = research_map[contact.id] || []
      const interactions = interaction_map[contact.id] || []
      const lastInteraction = interactions[0]

      const daysSinceContact = contact.last_contacted_at
        ? Math.floor(
            (Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999

      const targetFrequency =
        contact.priority === "high"
          ? settings.high_priority_frequency_days
          : contact.priority === "medium"
            ? settings.medium_priority_frequency_days
            : settings.low_priority_frequency_days

      const overdue = daysSinceContact > targetFrequency

      const recentNews = research.filter((r) => {
        const fetchedAt = new Date(r.fetched_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return fetchedAt > weekAgo
      })

      const importantNews = research.filter((r) => r.importance_score && r.importance_score >= 8)

      return {
        id: contact.id,
        name: contact.name,
        priority: contact.priority,
        is_friend: contact.is_friend,
        days_since_contact: daysSinceContact,
        target_frequency: targetFrequency,
        overdue,
        has_recent_news: recentNews.length > 0,
        has_important_news: importantNews.length > 0,
        recent_news_titles: recentNews.slice(0, 3).map((r) => r.title),
        associations: contact.associations,
        relationship_value: contact.relationship_value,
      }
    })

    // Use Claude to prioritize and explain
    const systemPrompt = `You are a relationship management expert. Analyze the contacts and determine who should be contacted first based on:
1. How overdue they are compared to target frequency
2. Important recent news or job changes (great conversation starters!)
3. Priority level and relationship value
4. Being a friend (more flexibility on timing but still important)

Return a prioritized list with urgency scores (0-100) and brief reasons.`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Analyze and prioritize these contacts. Return JSON array sorted by urgency:

${JSON.stringify(contactContexts, null, 2)}

Format:
{
  "prioritized": [
    {
      "id": "contact_id",
      "score": 85,
      "reason": "Brief reason why they're urgent",
      "suggested_action": "What to do (e.g., 'Congratulate on new role', 'Check in')"
    }
  ]
}`,
        },
      ],
      system: systemPrompt,
    })

    const textContent = response.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response")
    }

    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      data: result.prioritized,
    })
  } catch (error) {
    console.error("Prioritization error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to prioritize contacts" },
      { status: 500 }
    )
  }
}
