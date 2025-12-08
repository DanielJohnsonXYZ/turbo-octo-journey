"use client"

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Contact, ResearchItem, Interaction, MessageDraft, Settings } from "./types"

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isSupabaseConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "your_supabase_url" &&
  !supabaseUrl.includes("your")

let supabase: SupabaseClient | null = null

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!)
}

// ===================
// LOCAL STORAGE LAYER
// ===================

const STORAGE_KEYS = {
  contacts: "rmp_contacts",
  research: "rmp_research",
  interactions: "rmp_interactions",
  drafts: "rmp_drafts",
  settings: "rmp_settings",
}

function generateId(): string {
  return crypto.randomUUID()
}

function getFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

// ===================
// UNIFIED DATA LAYER
// ===================

// CONTACTS
export async function getContacts(): Promise<Contact[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false })
    if (error) throw error
    return data || []
  }
  return getFromStorage<Contact>(STORAGE_KEYS.contacts)
}

export async function getContact(id: string): Promise<Contact | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single()
    if (error) return null
    return data
  }
  const contacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  return contacts.find((c) => c.id === id) || null
}

export async function createContact(
  contact: Omit<Contact, "id" | "created_at" | "updated_at">
): Promise<Contact> {
  const newContact: Contact = {
    ...contact,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .insert(newContact)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const contacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  contacts.push(newContact)
  saveToStorage(STORAGE_KEYS.contacts, contacts)
  return newContact
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<Contact | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const contacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  const index = contacts.findIndex((c) => c.id === id)
  if (index === -1) return null

  contacts[index] = {
    ...contacts[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }
  saveToStorage(STORAGE_KEYS.contacts, contacts)
  return contacts[index]
}

export async function deleteContact(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from("contacts").delete().eq("id", id)
    if (error) throw error
    return true
  }

  const contacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  const filtered = contacts.filter((c) => c.id !== id)
  if (filtered.length === contacts.length) return false
  saveToStorage(STORAGE_KEYS.contacts, filtered)

  // Also delete related data
  const research = getFromStorage<ResearchItem>(STORAGE_KEYS.research).filter(
    (r) => r.contact_id !== id
  )
  saveToStorage(STORAGE_KEYS.research, research)

  const interactions = getFromStorage<Interaction>(STORAGE_KEYS.interactions).filter(
    (i) => i.contact_id !== id
  )
  saveToStorage(STORAGE_KEYS.interactions, interactions)

  return true
}

export async function importContacts(
  contacts: Omit<Contact, "id" | "created_at" | "updated_at">[]
): Promise<Contact[]> {
  const newContacts: Contact[] = contacts.map((c) => ({
    ...c,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  if (supabase) {
    const { data, error } = await supabase
      .from("contacts")
      .insert(newContacts)
      .select()
    if (error) throw error
    return data || []
  }

  const existingContacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  saveToStorage(STORAGE_KEYS.contacts, [...existingContacts, ...newContacts])
  return newContacts
}

// RESEARCH ITEMS
export async function getResearchItems(contactId?: string): Promise<ResearchItem[]> {
  if (supabase) {
    let query = supabase
      .from("research_items")
      .select("*")
      .order("fetched_at", { ascending: false })

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  const items = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  if (contactId) {
    return items.filter((r) => r.contact_id === contactId)
  }
  return items
}

export async function createResearchItem(
  item: Omit<ResearchItem, "id" | "created_at">
): Promise<ResearchItem> {
  const newItem: ResearchItem = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("research_items")
      .insert(newItem)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const items = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.research, items)
  return newItem
}

export async function markResearchAsRead(id: string): Promise<void> {
  if (supabase) {
    await supabase.from("research_items").update({ is_read: true }).eq("id", id)
    return
  }

  const items = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  const index = items.findIndex((r) => r.id === id)
  if (index !== -1) {
    items[index].is_read = true
    saveToStorage(STORAGE_KEYS.research, items)
  }
}

export async function deleteResearchItem(id: string): Promise<void> {
  if (supabase) {
    await supabase.from("research_items").delete().eq("id", id)
    return
  }

  const items = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  saveToStorage(STORAGE_KEYS.research, items.filter((r) => r.id !== id))
}

// INTERACTIONS
export async function getInteractions(contactId?: string): Promise<Interaction[]> {
  if (supabase) {
    let query = supabase
      .from("interactions")
      .select("*")
      .order("occurred_at", { ascending: false })

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  const items = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  const sorted = items.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
  if (contactId) {
    return sorted.filter((i) => i.contact_id === contactId)
  }
  return sorted
}

export async function createInteraction(
  interaction: Omit<Interaction, "id" | "created_at">
): Promise<Interaction> {
  const newItem: Interaction = {
    ...interaction,
    id: generateId(),
    created_at: new Date().toISOString(),
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("interactions")
      .insert(newItem)
      .select()
      .single()
    if (error) throw error

    // Update contact's last_contacted_at
    if (["outreach", "meeting", "call", "response"].includes(interaction.type)) {
      await supabase
        .from("contacts")
        .update({ last_contacted_at: interaction.occurred_at })
        .eq("id", interaction.contact_id)
    }

    return data
  }

  const items = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.interactions, items)

  // Update contact's last_contacted_at locally
  if (["outreach", "meeting", "call", "response"].includes(interaction.type)) {
    const contacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
    const contactIndex = contacts.findIndex((c) => c.id === interaction.contact_id)
    if (contactIndex !== -1) {
      contacts[contactIndex].last_contacted_at = interaction.occurred_at
      saveToStorage(STORAGE_KEYS.contacts, contacts)
    }
  }

  return newItem
}

export async function updateInteraction(
  id: string,
  updates: Partial<Interaction>
): Promise<Interaction | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("interactions")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const items = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  const index = items.findIndex((i) => i.id === id)
  if (index === -1) return null

  items[index] = { ...items[index], ...updates }
  saveToStorage(STORAGE_KEYS.interactions, items)
  return items[index]
}

export async function deleteInteraction(id: string): Promise<void> {
  if (supabase) {
    await supabase.from("interactions").delete().eq("id", id)
    return
  }

  const items = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  saveToStorage(STORAGE_KEYS.interactions, items.filter((i) => i.id !== id))
}

// MESSAGE DRAFTS
export async function getMessageDrafts(contactId?: string): Promise<MessageDraft[]> {
  if (supabase) {
    let query = supabase
      .from("message_drafts")
      .select("*")
      .order("created_at", { ascending: false })

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  const items = getFromStorage<MessageDraft>(STORAGE_KEYS.drafts)
  if (contactId) {
    return items.filter((d) => d.contact_id === contactId)
  }
  return items
}

export async function createMessageDraft(
  draft: Omit<MessageDraft, "id" | "created_at">
): Promise<MessageDraft> {
  const newItem: MessageDraft = {
    ...draft,
    id: generateId(),
    created_at: new Date().toISOString(),
  }

  if (supabase) {
    const { data, error } = await supabase
      .from("message_drafts")
      .insert(newItem)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const items = getFromStorage<MessageDraft>(STORAGE_KEYS.drafts)
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.drafts, items)
  return newItem
}

export async function updateMessageDraft(
  id: string,
  updates: Partial<MessageDraft>
): Promise<void> {
  if (supabase) {
    await supabase.from("message_drafts").update(updates).eq("id", id)
    return
  }

  const items = getFromStorage<MessageDraft>(STORAGE_KEYS.drafts)
  const index = items.findIndex((d) => d.id === id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates }
    saveToStorage(STORAGE_KEYS.drafts, items)
  }
}

// SETTINGS
const DEFAULT_SETTINGS: Settings = {
  id: "default",
  anthropic_api_key: null,
  newsapi_key: null,
  proxycurl_api_key: null,
  twitter_bearer_token: null,
  default_contact_frequency_days: 90,
  high_priority_frequency_days: 30,
  medium_priority_frequency_days: 60,
  low_priority_frequency_days: 120,
  updated_at: new Date().toISOString(),
}

export async function getSettings(): Promise<Settings> {
  if (supabase) {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single()
    if (error || !data) return DEFAULT_SETTINGS
    return data
  }

  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const data = localStorage.getItem(STORAGE_KEYS.settings)
  return data ? JSON.parse(data) : DEFAULT_SETTINGS
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  if (supabase) {
    const { data: existing } = await supabase.from("settings").select("id").single()

    if (existing) {
      const { data, error } = await supabase
        .from("settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from("settings")
        .insert({ ...DEFAULT_SETTINGS, ...updates })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  const current = await getSettings()
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(updated))
  return updated
}

// UTILITY
export async function clearAllData(): Promise<void> {
  if (supabase) {
    await Promise.all([
      supabase.from("interactions").delete().neq("id", ""),
      supabase.from("research_items").delete().neq("id", ""),
      supabase.from("message_drafts").delete().neq("id", ""),
      supabase.from("contacts").delete().neq("id", ""),
    ])
    return
  }

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

// Check if using Supabase or localStorage
export function isUsingSupabase(): boolean {
  return !!supabase
}

// Sync localStorage to Supabase (for migration)
export async function migrateToSupabase(): Promise<{ success: boolean; migrated: number }> {
  if (!supabase) {
    return { success: false, migrated: 0 }
  }

  let migrated = 0

  // Migrate contacts
  const localContacts = getFromStorage<Contact>(STORAGE_KEYS.contacts)
  if (localContacts.length > 0) {
    const { error } = await supabase.from("contacts").insert(localContacts)
    if (!error) migrated += localContacts.length
  }

  // Migrate research
  const localResearch = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  if (localResearch.length > 0) {
    await supabase.from("research_items").insert(localResearch)
  }

  // Migrate interactions
  const localInteractions = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  if (localInteractions.length > 0) {
    await supabase.from("interactions").insert(localInteractions)
  }

  // Clear localStorage after migration
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })

  return { success: true, migrated }
}
