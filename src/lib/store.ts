"use client"

import { Contact, ResearchItem, Interaction, MessageDraft, Settings } from "./types"

// Local storage keys
const STORAGE_KEYS = {
  contacts: "rmp_contacts",
  research: "rmp_research",
  interactions: "rmp_interactions",
  drafts: "rmp_drafts",
  settings: "rmp_settings",
}

// Generate UUID
function generateId(): string {
  return crypto.randomUUID()
}

// Generic storage helpers
function getFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

// Contacts
export function getContacts(): Contact[] {
  return getFromStorage<Contact>(STORAGE_KEYS.contacts)
}

export function getContact(id: string): Contact | undefined {
  return getContacts().find((c) => c.id === id)
}

export function createContact(contact: Omit<Contact, "id" | "created_at" | "updated_at">): Contact {
  const contacts = getContacts()
  const newContact: Contact = {
    ...contact,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  contacts.push(newContact)
  saveToStorage(STORAGE_KEYS.contacts, contacts)
  return newContact
}

export function updateContact(id: string, updates: Partial<Contact>): Contact | null {
  const contacts = getContacts()
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

export function deleteContact(id: string): boolean {
  const contacts = getContacts()
  const filtered = contacts.filter((c) => c.id !== id)
  if (filtered.length === contacts.length) return false
  saveToStorage(STORAGE_KEYS.contacts, filtered)

  // Also delete related data
  const research = getResearchItems().filter((r) => r.contact_id !== id)
  saveToStorage(STORAGE_KEYS.research, research)

  const interactions = getInteractions().filter((i) => i.contact_id !== id)
  saveToStorage(STORAGE_KEYS.interactions, interactions)

  return true
}

export function importContacts(contacts: Omit<Contact, "id" | "created_at" | "updated_at">[]): Contact[] {
  const existingContacts = getContacts()
  const newContacts: Contact[] = contacts.map((c) => ({
    ...c,
    id: generateId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
  saveToStorage(STORAGE_KEYS.contacts, [...existingContacts, ...newContacts])
  return newContacts
}

// Research Items
export function getResearchItems(contactId?: string): ResearchItem[] {
  const items = getFromStorage<ResearchItem>(STORAGE_KEYS.research)
  if (contactId) {
    return items.filter((r) => r.contact_id === contactId)
  }
  return items
}

export function createResearchItem(item: Omit<ResearchItem, "id" | "created_at">): ResearchItem {
  const items = getResearchItems()
  const newItem: ResearchItem = {
    ...item,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.research, items)
  return newItem
}

export function markResearchAsRead(id: string): void {
  const items = getResearchItems()
  const index = items.findIndex((r) => r.id === id)
  if (index !== -1) {
    items[index].is_read = true
    saveToStorage(STORAGE_KEYS.research, items)
  }
}

// Interactions
export function getInteractions(contactId?: string): Interaction[] {
  const items = getFromStorage<Interaction>(STORAGE_KEYS.interactions)
  if (contactId) {
    return items.filter((i) => i.contact_id === contactId).sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    )
  }
  return items.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
}

export function createInteraction(interaction: Omit<Interaction, "id" | "created_at">): Interaction {
  const items = getInteractions()
  const newItem: Interaction = {
    ...interaction,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.interactions, items)

  // Update contact's last_contacted_at
  if (interaction.type === "outreach" || interaction.type === "meeting" || interaction.type === "call") {
    updateContact(interaction.contact_id, {
      last_contacted_at: interaction.occurred_at,
    })
  }

  return newItem
}

// Message Drafts
export function getMessageDrafts(contactId?: string): MessageDraft[] {
  const items = getFromStorage<MessageDraft>(STORAGE_KEYS.drafts)
  if (contactId) {
    return items.filter((d) => d.contact_id === contactId)
  }
  return items
}

export function createMessageDraft(draft: Omit<MessageDraft, "id" | "created_at">): MessageDraft {
  const items = getMessageDrafts()
  const newItem: MessageDraft = {
    ...draft,
    id: generateId(),
    created_at: new Date().toISOString(),
  }
  items.push(newItem)
  saveToStorage(STORAGE_KEYS.drafts, items)
  return newItem
}

export function updateMessageDraft(id: string, updates: Partial<MessageDraft>): void {
  const items = getMessageDrafts()
  const index = items.findIndex((d) => d.id === id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates }
    saveToStorage(STORAGE_KEYS.drafts, items)
  }
}

// Settings
const DEFAULT_SETTINGS: Settings = {
  id: "default",
  anthropic_api_key: null,
  newsapi_key: null,
  proxycurl_api_key: null,
  default_contact_frequency_days: 90,
  high_priority_frequency_days: 30,
  medium_priority_frequency_days: 60,
  low_priority_frequency_days: 120,
  updated_at: new Date().toISOString(),
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  const data = localStorage.getItem(STORAGE_KEYS.settings)
  return data ? JSON.parse(data) : DEFAULT_SETTINGS
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const current = getSettings()
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(updated))
  return updated
}

// Clear all data (for testing/reset)
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
