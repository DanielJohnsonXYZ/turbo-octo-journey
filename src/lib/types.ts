// Relationship types determine tone and approach
export type RelationshipType =
  | "investor" // VCs, angels - more polished, respect their time
  | "founder_peer" // Fellow founders - casual, direct, mutual support
  | "mentor" // People who've helped you - grateful, updates on progress
  | "mentee" // People you help - supportive, offering value
  | "potential_hire" // Recruiting - enthusiastic about them, sell the opportunity
  | "service_provider" // Lawyers, accountants, etc. - professional, transactional
  | "industry_expert" // Domain experts - curious, learning-focused
  | "media" // Journalists, podcasters - helpful, newsworthy
  | "customer" // Customers/users - supportive, listening
  | "friend" // Genuine friends - casual, personal
  | "acquaintance" // Met once or twice - warm but not assuming closeness
  | "other"

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
  relationship_type: RelationshipType | null // How you relate to this person
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

// Your profile - used to personalize all generated messages
export interface UserProfile {
  name: string
  role: string | null // "Founder at X", "Product Manager", etc.
  communication_style: string | null // "casual and friendly", "professional but warm", etc.
  about: string | null // Brief background that might be relevant
  signature: string | null // How you sign off emails
  sample_messages: string[] // Examples of YOUR writing style for Claude to learn from
  avoid_phrases: string[] // Phrases you never use or want to avoid
  preferred_openers: string[] // Ways you like to start messages
}

export interface Settings {
  id: string
  // API Keys
  anthropic_api_key: string | null
  newsapi_key: string | null
  proxycurl_api_key: string | null
  twitter_bearer_token: string | null
  // Contact frequency defaults
  default_contact_frequency_days: number
  high_priority_frequency_days: number
  medium_priority_frequency_days: number
  low_priority_frequency_days: number
  // User profile for personalization
  user_profile: UserProfile | null
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

// Relationship type metadata - defines tone and approach for each type
export const RELATIONSHIP_TYPE_META: Record<RelationshipType, {
  label: string
  tone: string
  approach: string
  topics: string[]
  defaultChannel: InteractionChannel
}> = {
  investor: {
    label: "Investor",
    tone: "Polished and respectful of their time. Confident but not arrogant.",
    approach: "Lead with substance - updates, insights, or genuine questions. No fluff. They see hundreds of pitches, so be memorable by being genuinely interesting.",
    topics: ["portfolio company insights", "market trends", "your traction/progress", "strategic questions"],
    defaultChannel: "email",
  },
  founder_peer: {
    label: "Founder/Peer",
    tone: "Casual and direct. Fellow traveler energy.",
    approach: "Be real - share struggles and wins alike. Mutual support vibe. Can be more vulnerable and direct than with others.",
    topics: ["shared challenges", "resource sharing", "introductions", "real talk about the journey"],
    defaultChannel: "text",
  },
  mentor: {
    label: "Mentor",
    tone: "Grateful and update-focused. Show you value their past advice.",
    approach: "Share progress on things they've helped with. Ask thoughtful questions that show you've done your homework. Don't waste their time with basics.",
    topics: ["progress updates", "specific challenges", "asking for perspective", "thanking for past help"],
    defaultChannel: "email",
  },
  mentee: {
    label: "Mentee",
    tone: "Supportive and encouraging. Generous with your time.",
    approach: "Check in on their progress. Offer help proactively. Share relevant resources or connections.",
    topics: ["their progress", "offering resources", "making introductions", "celebrating their wins"],
    defaultChannel: "linkedin",
  },
  potential_hire: {
    label: "Potential Hire",
    tone: "Enthusiastic about them specifically. Sell the opportunity authentically.",
    approach: "Show you've researched them. Connect their skills/interests to what you're building. Be genuine about the opportunity and challenges.",
    topics: ["their background", "the role/opportunity", "team and culture", "their questions"],
    defaultChannel: "email",
  },
  service_provider: {
    label: "Service Provider",
    tone: "Professional and efficient. Friendly but transactional.",
    approach: "Be clear about needs. Respect their expertise. Keep relationship warm but purposeful.",
    topics: ["project updates", "new needs", "referrals", "maintaining relationship"],
    defaultChannel: "email",
  },
  industry_expert: {
    label: "Industry Expert",
    tone: "Curious and learning-focused. Show intellectual engagement.",
    approach: "Ask genuinely interesting questions. Share your own insights to make it a two-way conversation. Reference their work specifically.",
    topics: ["their expertise area", "industry trends", "your learning questions", "sharing relevant findings"],
    defaultChannel: "linkedin",
  },
  media: {
    label: "Media/Press",
    tone: "Helpful and newsworthy. Make their job easier.",
    approach: "Lead with what's interesting for their audience. Be quotable. Offer exclusive angles or data.",
    topics: ["story ideas", "industry insights", "company news", "expert commentary"],
    defaultChannel: "email",
  },
  customer: {
    label: "Customer",
    tone: "Supportive and listening-focused. Genuinely care about their success.",
    approach: "Check in on how things are going. Listen for feedback. Offer help proactively.",
    topics: ["their experience", "new features", "their feedback", "success stories"],
    defaultChannel: "email",
  },
  friend: {
    label: "Friend",
    tone: "Casual and personal. Real friendship energy.",
    approach: "Be yourself. Talk about life, not just work. Remember personal details.",
    topics: ["life updates", "personal interests", "shared experiences", "just catching up"],
    defaultChannel: "text",
  },
  acquaintance: {
    label: "Acquaintance",
    tone: "Warm but not assuming closeness. Friendly professional.",
    approach: "Reference how you met. Don't assume they remember you well. Provide context.",
    topics: ["relevant shared context", "specific reason for reaching out", "offering value"],
    defaultChannel: "linkedin",
  },
  other: {
    label: "Other",
    tone: "Friendly and professional. Adapt based on context.",
    approach: "Be genuine and clear about why you're reaching out.",
    topics: ["reason for outreach", "mutual value"],
    defaultChannel: "email",
  },
}
