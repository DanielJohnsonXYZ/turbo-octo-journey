import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Contact, ResearchItem, Interaction, UserProfile } from "@/lib/types"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Message purposes - what the user wants to achieve
type MessagePurpose =
  | "reconnect" // Haven't talked in a while
  | "congratulate" // Something good happened to them
  | "share_resource" // Share something helpful
  | "ask_advice" // Ask for their input
  | "offer_help" // Offer assistance
  | "follow_up" // Following up on something
  | "introduce" // Make an introduction
  | "thank" // Express gratitude
  | "check_in" // Just staying in touch
  | "custom" // Custom goal

// Tone options
type MessageTone = "casual" | "warm" | "professional" | "enthusiastic" | "thoughtful"

interface GenerateMessageRequest {
  contact: Contact
  research_items: ResearchItem[]
  recent_interactions: Interaction[]
  user_profile: UserProfile | null
  purpose: MessagePurpose
  tone?: MessageTone
  custom_goal?: string
  channel: "email" | "linkedin" | "text" | "twitter"
  key_points?: string[] // Specific things user wants to mention
}

function formatResearchContext(items: ResearchItem[]): string {
  if (!items.length) return "No recent news or updates found about this person."

  // Prioritize unread and high-importance items
  const sorted = [...items]
    .sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
      return (b.importance_score || 0) - (a.importance_score || 0)
    })
    .slice(0, 6)

  return sorted
    .map((r) => {
      const age = Math.floor(
        (Date.now() - new Date(r.fetched_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      const ageStr = age === 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`
      return `• [${r.source.toUpperCase()}] "${r.title}" (${ageStr})
  ${r.summary || "No summary available"}
  ${r.url ? `Source: ${r.url}` : ""}`
    })
    .join("\n\n")
}

function formatInteractionHistory(interactions: Interaction[]): string {
  if (!interactions.length) return "No previous interactions recorded."

  return interactions
    .slice(0, 5)
    .map((i) => {
      const date = new Date(i.occurred_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      const sentiment = i.sentiment ? ` [${i.sentiment}]` : ""
      return `• ${date} - ${i.type.replace(/_/g, " ")} via ${i.channel}${sentiment}
  ${i.subject ? `Subject: "${i.subject}"` : ""}
  ${i.content ? `Content: "${i.content.slice(0, 300)}${i.content.length > 300 ? "..." : ""}"` : ""}
  ${i.outcome ? `Outcome: ${i.outcome}` : ""}`
    })
    .join("\n\n")
}

function formatUserProfile(profile: UserProfile | null): string {
  if (!profile) {
    return `No user profile configured. Write in a friendly, professional tone.`
  }

  let result = `**About the sender:**
- Name: ${profile.name}
${profile.role ? `- Role: ${profile.role}` : ""}
${profile.communication_style ? `- Their communication style: ${profile.communication_style}` : ""}
${profile.about ? `- Background: ${profile.about}` : ""}
${profile.signature ? `- Signature: "${profile.signature}"` : ""}`

  if (profile.sample_messages?.length) {
    result += `\n\n**Examples of how they write (MATCH THIS STYLE):**\n`
    result += profile.sample_messages.map((m) => `"${m}"`).join("\n\n")
  }

  if (profile.preferred_openers?.length) {
    result += `\n\n**Opening styles they like:** ${profile.preferred_openers.join(", ")}`
  }

  if (profile.avoid_phrases?.length) {
    result += `\n\n**NEVER use these phrases:** ${profile.avoid_phrases.join(", ")}`
  }

  return result
}

function getPurposeGuidance(purpose: MessagePurpose, customGoal?: string): string {
  const guidance: Record<MessagePurpose, string> = {
    reconnect: `This is a reconnection message after not being in touch for a while. Focus on:
- Acknowledge the time gap naturally (don't over-apologize)
- Reference something specific you remember about them or shared together
- Show genuine interest in what they've been up to
- Keep it light and open-ended`,

    congratulate: `This is a congratulatory message. Focus on:
- Be specific about what you're congratulating them on
- Show genuine enthusiasm without being over the top
- Reference why this achievement matters based on what you know about them
- Keep it brief - don't make it about you`,

    share_resource: `You're sharing something helpful with them. Focus on:
- Briefly explain why you thought of them specifically
- Don't over-explain the resource - let them discover it
- Make it easy to ignore if not relevant
- Frame it as "thought you might find this interesting" not "you need to see this"`,

    ask_advice: `You're asking for their input or advice. Focus on:
- Be specific about what you need help with
- Explain briefly why you're asking them specifically
- Make it easy to say no or defer
- Show you value their time`,

    offer_help: `You're offering to help them with something. Focus on:
- Be specific about how you could help
- Reference why you're in a position to help
- Make it feel like a genuine offer, not a transaction
- No strings attached tone`,

    follow_up: `This is a follow-up to a previous conversation or request. Focus on:
- Reference the specific previous discussion
- Add new value if possible
- Make it easy for them to respond
- Be patient in tone`,

    introduce: `You're making or facilitating an introduction. Focus on:
- Be clear about why these people should connect
- Give enough context for both parties
- Make the ask specific
- Follow up appropriately`,

    thank: `This is a thank you message. Focus on:
- Be specific about what you're thanking them for
- Explain the impact their help had
- Keep it genuine and not transactional
- Brief is better`,

    check_in: `This is a casual check-in to stay in touch. Focus on:
- Keep it light and natural
- Reference something relevant to them
- Ask about something specific, not just "how are you"
- Make it easy to respond`,

    custom: customGoal || "Achieve the user's specific goal while being genuine and natural.",
  }

  return guidance[purpose]
}

function getChannelGuidance(channel: string): string {
  const guidance: Record<string, string> = {
    email: `**Email format:**
- Include a subject line (clear but not clickbaity)
- Can be 2-4 paragraphs
- Professional but personal
- Include appropriate sign-off`,

    linkedin: `**LinkedIn message format:**
- Keep it shorter (1-2 paragraphs max)
- More casual than email
- No subject line needed
- Don't start with "I hope this finds you well"`,

    text: `**Text message format:**
- Very brief (2-3 sentences)
- Casual and direct
- No formalities
- Emojis OK if appropriate`,

    twitter: `**Twitter DM format:**
- Very brief
- Casual tone
- Direct to the point
- No formal sign-off`,
  }

  return guidance[channel] || guidance.email
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMessageRequest = await request.json()
    const {
      contact,
      research_items,
      recent_interactions,
      user_profile,
      purpose,
      tone = "warm",
      custom_goal,
      channel,
      key_points,
    } = body

    const daysSinceContact = contact.last_contacted_at
      ? Math.floor(
          (Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    const systemPrompt = `You are an expert at writing natural, genuine messages that strengthen relationships. Your goal is to help maintain authentic connections, not to sound like a robot or a salesperson.

**Core principles:**
1. Sound like a real human who actually knows this person
2. Reference SPECIFIC details - never be vague
3. Match the sender's writing style exactly if samples are provided
4. Keep it concise - respect their time
5. Never sound transactional or networking-y
6. Avoid clichés like "hope you're well" or "hope this finds you"
7. Don't be sycophantic or over-compliment
8. If there's nothing specific to reference, it's OK to be brief

**What makes a message feel genuine:**
- Specific references to shared experiences or their work
- Natural language (contractions, casual phrasing)
- Appropriate length for the relationship
- Shows you actually pay attention to them
- Asks questions you genuinely want answers to

**What makes a message feel fake:**
- Generic statements that could apply to anyone
- Over-the-top enthusiasm
- Forced name usage
- Obvious "networking" language
- Too many compliments`

    const userPrompt = `Generate a ${tone} ${channel} message for the following situation:

---

${formatUserProfile(user_profile)}

---

**About the recipient:**
- Name: ${contact.name}
${contact.company ? `- Company: ${contact.company}` : ""}
${contact.job_title ? `- Role: ${contact.job_title}` : ""}
${contact.location ? `- Location: ${contact.location}` : ""}
- Relationship: ${contact.is_friend ? "Friend" : "Professional contact"}${contact.is_professional ? " (Professional)" : ""}
${contact.communication_style ? `- Their preferred communication style: ${contact.communication_style}` : ""}
${contact.how_we_met ? `- How we met: ${contact.how_we_met}` : ""}
${contact.associations?.length ? `- Associations/Groups: ${contact.associations.join(", ")}` : ""}
${contact.relationship_value?.length ? `- What they bring to the relationship: ${contact.relationship_value.join(", ")}` : ""}
${contact.notes ? `- Personal notes: ${contact.notes}` : ""}
${contact.last_update_notes ? `- Recent update about them: ${contact.last_update_notes}` : ""}
${contact.next_steps ? `- Planned next steps: ${contact.next_steps}` : ""}

**Time since last contact:** ${daysSinceContact !== null ? `${daysSinceContact} days` : "Never contacted before"}

---

**Recent news/updates about them:**
${formatResearchContext(research_items)}

---

**Our interaction history:**
${formatInteractionHistory(recent_interactions)}

---

**Message purpose:** ${purpose.replace(/_/g, " ")}
${getPurposeGuidance(purpose, custom_goal)}

${getChannelGuidance(channel)}

${key_points?.length ? `**Specific points to include:**\n${key_points.map((p) => `- ${p}`).join("\n")}` : ""}

---

Now generate the message. Remember:
- Sound like a real person, not a template
- Use specific details from the research and history
- Match the sender's style if samples were provided
- Keep it appropriate length for ${channel}

Return your response as JSON:
{
  "subject": "Email subject line (only for email, null otherwise)",
  "message": "The complete message text",
  "talking_points": ["3-4 conversation topics if this leads to a call/meeting"],
  "why_now": "Brief explanation of why this is a good time to reach out",
  "personalization_used": ["List of specific details you incorporated from research/history"]
}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    })

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
        why_now: result.why_now,
        personalization_used: result.personalization_used,
        context: {
          days_since_contact: daysSinceContact,
          research_count: research_items.length,
          interaction_count: recent_interactions.length,
          purpose,
          tone,
          channel,
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
