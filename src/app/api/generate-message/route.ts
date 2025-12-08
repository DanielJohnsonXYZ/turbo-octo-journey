import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Contact, ResearchItem, Interaction } from "@/lib/types"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface GenerateMessageRequest {
  contact: Contact
  research_items: ResearchItem[]
  recent_interactions: Interaction[]
  user_goal?: string
  message_type?: "check_in" | "congratulate" | "ask" | "share" | "custom"
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMessageRequest = await request.json()
    const { contact, research_items, recent_interactions, user_goal, message_type = "check_in" } = body

    // Build context for Claude
    const researchContext = research_items
      .filter((r) => !r.is_read || r.importance_score && r.importance_score >= 7)
      .slice(0, 5)
      .map((r) => `- [${r.source}] ${r.title}: ${r.summary || "No summary"}`)
      .join("\n")

    const interactionContext = recent_interactions
      .slice(0, 3)
      .map((i) => `- ${i.occurred_at}: ${i.type} via ${i.channel}${i.content ? ` - "${i.content.slice(0, 200)}..."` : ""}`)
      .join("\n")

    const daysSinceContact = contact.last_contacted_at
      ? Math.floor(
          (Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    const systemPrompt = `You are an expert relationship manager helping maintain authentic professional and personal connections. Your role is to craft personalized, genuine messages that feel human and warm, not robotic or sales-y.

Key principles:
- Be authentic and genuine, never fake or overly promotional
- Match the communication style specified for this person
- Reference specific details to show you've been paying attention
- Keep messages concise but meaningful
- Focus on providing value or genuine connection, not asking for things
- If there's recent news about them, incorporate it naturally
- Consider the relationship type (professional vs friend) in tone`

    const userPrompt = `Generate a personalized message for this contact:

**Contact Profile:**
- Name: ${contact.name}
- Location: ${contact.location || "Unknown"}
- Communication Style: ${contact.communication_style || "Not specified - be friendly and professional"}
- How We Met: ${contact.how_we_met || "Unknown"}
- Relationship Type: ${contact.is_friend ? "Friend" : "Professional Contact"}
- Priority: ${contact.priority || "medium"}
- Associations/Tags: ${contact.associations?.join(", ") || "None"}
- Value They Provide: ${contact.relationship_value?.join(", ") || "General connection"}
- Notes About Them: ${contact.notes || "No notes"}
- Last Update About Them: ${contact.last_update_notes || "No recent updates"}
- Next Steps I Had Planned: ${contact.next_steps || "Just keeping in touch"}

**Days Since Last Contact:** ${daysSinceContact !== null ? `${daysSinceContact} days` : "Never contacted"}

**Recent Research/News About Them:**
${researchContext || "No recent research available"}

**Our Recent Interaction History:**
${interactionContext || "No recent interactions logged"}

**Message Type:** ${message_type}
${user_goal ? `**Specific Goal:** ${user_goal}` : ""}

Please generate:
1. A brief subject line (if email) or opening hook
2. The full message (keep it concise - 2-4 short paragraphs max)
3. 2-3 talking points I could use if this becomes a conversation

Format your response as JSON:
{
  "subject": "Subject line or opening hook",
  "message": "The full message text",
  "talking_points": ["Point 1", "Point 2", "Point 3"]
}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    })

    // Extract the text content
    const textContent = response.content.find((c) => c.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response")
    }

    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      success: true,
      data: {
        subject: result.subject,
        message: result.message,
        talking_points: result.talking_points,
        context_used: {
          days_since_contact: daysSinceContact,
          research_count: research_items.length,
          interaction_count: recent_interactions.length,
        },
      },
    })
  } catch (error) {
    console.error("Message generation error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate message" },
      { status: 500 }
    )
  }
}
