export interface Contact {
  id: string
  name: string
  email: string | null
  linkedin_url: string | null
  twitter_handle: string | null
  website_url: string | null
  rss_feed_url: string | null
  company: string | null
  job_title: string | null
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
  source: "linkedin" | "news" | "twitter" | "web" | "rss" | "manual" | "company"
  source_name: string | null // e.g., "TechCrunch", "LinkedIn", "@username"
  title: string
  summary: string | null
  url: string | null
  raw_content: string | null
  image_url: string | null
  importance_score: number | null // 1-10
  is_read: boolean
  fetched_at: string
  created_at: string
}

// Extended interaction types for better history tracking
export type InteractionType =
  | "outreach" // You reached out
  | "response" // They responded
  | "meeting" // Had a meeting
  | "call" // Phone/video call
  | "note" // Personal note
  | "email_sent" // Sent email
  | "email_received" // Received email
  | "linkedin_message" // LinkedIn message
  | "linkedin_connection" // Connected on LinkedIn
  | "linkedin_comment" // Commented on their post
  | "twitter_mention" // Twitter interaction
  | "introduction" // Made/received introduction
  | "referral" // Referral given/received
  | "coffee_chat" // Informal meetup
  | "event" // Met at event
  | "collaboration" // Worked together on something
  | "favor_asked" // Asked for favor
  | "favor_given" // Did a favor
  | "milestone" // Their milestone (promotion, funding, etc.)

export type InteractionChannel =
  | "email"
  | "linkedin"
  | "twitter"
  | "whatsapp"
  | "phone"
  | "video_call"
  | "in_person"
  | "slack"
  | "text"
  | "other"

export interface Interaction {
  id: string
  contact_id: string
  type: InteractionType
  channel: InteractionChannel
  subject: string | null // Email subject or meeting title
  content: string | null
  outcome: string | null
  follow_up_needed: boolean
  follow_up_date: string | null
  sentiment: "positive" | "neutral" | "negative" | null
  tags: string[] // Custom tags for categorization
  attachments: string[] // URLs to attachments
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
  twitter_bearer_token: string | null
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

// Interaction type metadata for UI
export const INTERACTION_TYPE_META: Record<InteractionType, { label: string; icon: string; color: string }> = {
  outreach: { label: "Outreach", icon: "send", color: "blue" },
  response: { label: "Response", icon: "reply", color: "green" },
  meeting: { label: "Meeting", icon: "calendar", color: "purple" },
  call: { label: "Call", icon: "phone", color: "orange" },
  note: { label: "Note", icon: "sticky-note", color: "gray" },
  email_sent: { label: "Email Sent", icon: "mail", color: "blue" },
  email_received: { label: "Email Received", icon: "inbox", color: "green" },
  linkedin_message: { label: "LinkedIn Message", icon: "linkedin", color: "blue" },
  linkedin_connection: { label: "Connected", icon: "user-plus", color: "blue" },
  linkedin_comment: { label: "LinkedIn Comment", icon: "message-circle", color: "blue" },
  twitter_mention: { label: "Twitter", icon: "twitter", color: "sky" },
  introduction: { label: "Introduction", icon: "users", color: "purple" },
  referral: { label: "Referral", icon: "share", color: "green" },
  coffee_chat: { label: "Coffee Chat", icon: "coffee", color: "amber" },
  event: { label: "Event", icon: "calendar", color: "pink" },
  collaboration: { label: "Collaboration", icon: "handshake", color: "indigo" },
  favor_asked: { label: "Favor Asked", icon: "help-circle", color: "yellow" },
  favor_given: { label: "Favor Given", icon: "gift", color: "green" },
  milestone: { label: "Milestone", icon: "trophy", color: "gold" },
}

export const CHANNEL_META: Record<InteractionChannel, { label: string; icon: string }> = {
  email: { label: "Email", icon: "mail" },
  linkedin: { label: "LinkedIn", icon: "linkedin" },
  twitter: { label: "Twitter/X", icon: "twitter" },
  whatsapp: { label: "WhatsApp", icon: "message-circle" },
  phone: { label: "Phone", icon: "phone" },
  video_call: { label: "Video Call", icon: "video" },
  in_person: { label: "In Person", icon: "users" },
  slack: { label: "Slack", icon: "hash" },
  text: { label: "Text/SMS", icon: "smartphone" },
  other: { label: "Other", icon: "more-horizontal" },
}
