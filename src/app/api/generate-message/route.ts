import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  Contact,
  ResearchItem,
  Interaction,
  UserProfile,
  RelationshipType,
  RELATIONSHIP_TYPE_META,
} from "@/lib/types"

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

interface GenerateMessageRequest {
  contact: Contact
  research_items: ResearchItem[]
  recent_interactions: Interaction[]
  user_profile: UserProfile | null
  purpose: MessagePurpose
  custom_goal?: string
  channel: "email" | "linkedin" | "text" | "twitter"
  key_points?: string[] // Specific things user wants to mention
}

function formatResearchForQuestions(items: ResearchItem[]): string {
  if (!items.length) return ""

  // Get unread and high-importance items first
  const sorted = [...items]
    .sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
      return (b.importance_score || 0) - (a.importance_score || 0)
    })
    .slice(0, 5)

  return sorted
    .map((r) => {
      const age = Math.floor(
        (Date.now() - new Date(r.fetched_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      const ageStr = age === 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`
      return `**${r.title}** (${r.source}, ${ageStr})
${r.summary || r.raw_content?.slice(0, 500) || "No details"}
${r.url ? `URL: ${r.url}` : ""}`
    })
    .join("\n\n---\n\n")
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
      return `• ${date} - ${i.type.replace(/_/g, " ")} via ${i.channel}
  ${i.subject ? `Subject: "${i.subject}"` : ""}
  ${i.content ? `What was discussed: "${i.content.slice(0, 400)}${i.content.length > 400 ? "..." : ""}"` : ""}
  ${i.outcome ? `Outcome: ${i.outcome}` : ""}`
    })
    .join("\n\n")
}

function formatUserProfile(profile: UserProfile | null): string {
  if (!profile) {
    return `No user profile. Write in a friendly, professional tone without emojis.`
  }

  let result = `**About you (the sender):**
- Name: ${profile.name}
${profile.role ? `- Role: ${profile.role}` : ""}
${profile.communication_style ? `- Your communication style: ${profile.communication_style}` : ""}
${profile.about ? `- Background: ${profile.about}` : ""}
${profile.signature ? `- Sign-off: "${profile.signature}"` : ""}`

  if (profile.sample_messages?.length) {
    result += `\n\n**Examples of how you actually write (MATCH THIS STYLE EXACTLY):**\n`
    result += profile.sample_messages.map((m, i) => `${i + 1}. "${m}"`).join("\n\n")
  }

  if (profile.preferred_openers?.length) {
    result += `\n\n**Opening styles you use:** ${profile.preferred_openers.join(", ")}`
  }

  if (profile.avoid_phrases?.length) {
    result += `\n\n**NEVER use these phrases:** ${profile.avoid_phrases.join(", ")}`
  }

  return result
}

function getRelationshipGuidance(type: RelationshipType | null): string {
  if (!type || !RELATIONSHIP_TYPE_META[type]) {
    return `No specific relationship type set. Use a friendly professional tone.`
  }

  const meta = RELATIONSHIP_TYPE_META[type]
  return `**Relationship type:** ${meta.label}
**Tone guidance:** ${meta.tone}
**Approach:** ${meta.approach}
**Good topics for this relationship:** ${meta.topics.join(", ")}`
}

function getTimeGapGuidance(daysSinceContact: number | null): string {
  if (daysSinceContact === null) {
    return `**First time reaching out** - Introduce yourself briefly, reference how you know them or why you're reaching out.`
  }

  if (daysSinceContact <= 14) {
    return `**Recent contact (${daysSinceContact} days ago)** - No need to acknowledge the gap. Jump right into the reason for reaching out.`
  }

  if (daysSinceContact <= 30) {
    return `**About a month since last contact** - Brief acknowledgment OK but not required. Keep it casual.`
  }

  if (daysSinceContact <= 90) {
    return `**A few months since last contact (${daysSinceContact} days)** - Light acknowledgment of time passing can feel natural, like "Been a while!" but don't over-apologize.`
  }

  if (daysSinceContact <= 180) {
    return `**6+ months since last contact (${daysSinceContact} days)** - Acknowledge the gap naturally. Something like "I know it's been a while" works. Provide brief context for reaching out now.`
  }

  return `**Long time since contact (${daysSinceContact} days / ${Math.floor(daysSinceContact / 30)} months)** - Definitely acknowledge the gap. Be genuine about it. Reference something specific you remember about them to show you haven't forgotten.`
}

function getPurposeGuidance(purpose: MessagePurpose, customGoal?: string): string {
  const guidance: Record<MessagePurpose, string> = {
    reconnect: `Reconnecting after time apart. Reference something specific about them or your history together.`,
    congratulate: `Congratulating on something specific. Be genuine, not generic. Ask a thoughtful follow-up question.`,
    share_resource: `Sharing something useful. Explain briefly why you thought of them specifically.`,
    ask_advice: `Asking for their input. Be specific about what you need. Show you value their time.`,
    offer_help: `Offering to help with something. Be specific and genuine. No strings attached.`,
    follow_up: `Following up on a previous conversation. Reference the specific discussion.`,
    introduce: `Making or facilitating an introduction. Be clear about why.`,
    thank: `Expressing genuine gratitude. Be specific about what they did and its impact.`,
    check_in: `Casual check-in to stay in touch. Reference something relevant to them.`,
    custom: customGoal || "Achieve the specific goal while being genuine.",
  }

  return guidance[purpose]
}

function getChannelGuidance(channel: string): string {
  const guidance: Record<string, string> = {
    email: `**Email:** 2-3 short paragraphs. Include subject line. Can be more detailed.`,
    linkedin: `**LinkedIn:** 1-2 paragraphs max. More casual than email. No subject line.`,
    text: `**Text:** 2-4 sentences. Very casual. Direct.`,
    twitter: `**Twitter DM:** Brief. Casual. Get to the point.`,
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
      custom_goal,
      channel,
      key_points,
    } = body

    const daysSinceContact = contact.last_contacted_at
      ? Math.floor(
          (Date.now() - new Date(contact.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null

    const hasRecentNews = research_items.some(
      (r) => !r.is_read || (r.importance_score && r.importance_score >= 6)
    )

    const systemPrompt = `You are helping someone maintain genuine relationships. Your job is to write messages that sound like THEM, not like an AI.

**Core rules:**
1. NO EMOJIS ever
2. Sound like a real person who actually knows this contact
3. Reference SPECIFIC details - vague is death
4. Keep it concise - respect their time
5. Never sound like networking or sales
6. Never use clichés like "Hope this finds you well", "Just circling back", "Hope you're crushing it"
7. If there's news about them, ask a genuinely INTERESTING question about it - not generic

**What makes a question interesting vs generic:**
- Generic: "Congrats on the funding! How does it feel?"
- Interesting: "Congrats on the Series A! Curious how you're thinking about the build vs buy decision for [specific thing mentioned in news]?"

- Generic: "Saw you launched the new feature. How's it going?"
- Interesting: "Saw the launch! The [specific detail] is clever. Did you consider [alternative approach] or was there a reason to go this direction?"

**The goal is to ask questions that:**
- Show you actually read/understood what happened
- Touch on non-obvious implications
- Are things you'd genuinely want to know the answer to
- Demonstrate relevant knowledge/insight

If there's no recent news, it's OK to just check in warmly without forcing a hook.`

    const userPrompt = `Generate a message for the following situation:

---

${formatUserProfile(user_profile)}

---

**About the recipient:**
- Name: ${contact.name}
${contact.company ? `- Company: ${contact.company}` : ""}
${contact.job_title ? `- Role: ${contact.job_title}` : ""}
${contact.location ? `- Location: ${contact.location}` : ""}
${contact.how_we_met ? `- How you met: ${contact.how_we_met}` : ""}
${contact.associations?.length ? `- Context/Groups: ${contact.associations.join(", ")}` : ""}
${contact.notes ? `- Your notes about them: ${contact.notes}` : ""}
${contact.last_update_notes ? `- Recent update you noted: ${contact.last_update_notes}` : ""}
${contact.next_steps ? `- You had planned: ${contact.next_steps}` : ""}

${getRelationshipGuidance(contact.relationship_type)}

${getTimeGapGuidance(daysSinceContact)}

---

**Recent news/updates about them:**
${hasRecentNews ? formatResearchForQuestions(research_items) : "No recent news found. A simple check-in without a specific hook is fine."}

---

**Your interaction history with them:**
${formatInteractionHistory(recent_interactions)}

---

**Message purpose:** ${purpose.replace(/_/g, " ")}
${getPurposeGuidance(purpose, custom_goal)}

${getChannelGuidance(channel)}

${key_points?.length ? `**Specific points to include:**\n${key_points.map((p) => `- ${p}`).join("\n")}` : ""}

---

Write the message now. Remember:
- Match the sender's writing style from their samples
- NO emojis
- If there's news, ask an interesting, specific question about it
- If no news, a warm check-in is fine
- Keep it appropriate length for ${channel}

Return as JSON:
{
  "subject": "Email subject line (null if not email)",
  "message": "The complete message",
  "interesting_questions": ["2-3 specific questions you could ask based on the research/context"],
  "talking_points": ["3-4 topics if this becomes a conversation"],
  "why_this_works": "Brief explanation of why this message should resonate"
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
        interesting_questions: result.interesting_questions,
        talking_points: result.talking_points,
        why_this_works: result.why_this_works,
        context: {
          days_since_contact: daysSinceContact,
          relationship_type: contact.relationship_type,
          research_count: research_items.length,
          has_recent_news: hasRecentNews,
          interaction_count: recent_interactions.length,
          purpose,
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
