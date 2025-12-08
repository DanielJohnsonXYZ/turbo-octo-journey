export interface Contact {
  id: string
  name: string
  email: string | null
  linkedin_url: string | null
  location: string | null
  status: string | null
  priority: "high" | "medium" | "low" | null
  associations: string[] // tags like "Google Mentor", "Techstars", etc.
  communication_style: string | null
  how_we_met: string | null
  relationship_value: string[] // what value they provide
  is_professional: boolean
  is_friend: boolean
  is_archived: boolean
  dont_need_to_contact: boolean
  last_contacted_at: string | null
  next_contact_at: string | null // AI-calculated
  notes: string | null
  next_steps: string | null
  last_update_notes: string | null // "Last Update?" field from Notion
  contact_score: number | null // AI-calculated priority score 0-100
  created_at: string
  updated_at: string
}

export interface ResearchItem {
  id: string
  contact_id: string
  source: "linkedin" | "news" | "twitter" | "web" | "manual"
  source_name: string | null // e.g., "TechCrunch", "LinkedIn"
  title: string
  summary: string | null
  url: string | null
  raw_content: string | null
  importance_score: number | null // 1-10
  is_read: boolean
  fetched_at: string
  created_at: string
}

export interface Interaction {
  id: string
  contact_id: string
  type: "outreach" | "response" | "meeting" | "note" | "call"
  channel: "email" | "linkedin" | "whatsapp" | "phone" | "in_person" | "other"
  content: string | null
  outcome: string | null
  sentiment: "positive" | "neutral" | "negative" | null
  occurred_at: string
  created_at: string
}

export interface MessageDraft {
  id: string
  contact_id: string
  context_used: {
    recent_research: ResearchItem[]
    last_interaction: Interaction | null
    communication_style: string | null
    relationship_type: string
    days_since_contact: number | null
  }
  generated_message: string
  was_sent: boolean
  was_edited: boolean
  final_version: string | null
  created_at: string
}

export interface Settings {
  id: string
  anthropic_api_key: string | null
  newsapi_key: string | null
  proxycurl_api_key: string | null
  default_contact_frequency_days: number
  high_priority_frequency_days: number
  medium_priority_frequency_days: number
  low_priority_frequency_days: number
  updated_at: string
}

// For dashboard display
export interface ContactWithContext extends Contact {
  recent_research: ResearchItem[]
  last_interaction: Interaction | null
  days_since_contact: number | null
  urgency_reason: string | null
}

// For AI message generation
export interface MessageGenerationContext {
  contact: Contact
  research_items: ResearchItem[]
  recent_interactions: Interaction[]
  user_goal?: string
}

// CSV import mapping
export interface NotionContactImport {
  Name: string
  Status: string
  Associations: string
  Location: string
  "Last Update?": string
  "Last Contacted": string
  "Professional Contact": string
  "Communication Style": string
  "How we met": string
  LinkedIn: string
  "Next Steps": string
  Value: string
  Priority: string
  Archive: string
  "Don't Need To Contact": string
  Friend: string
}
