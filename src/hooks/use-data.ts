"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getContacts,
  getContact,
  getResearchItems,
  getInteractions,
  getSettings,
  createContact,
  updateContact,
  deleteContact,
  createResearchItem,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  updateSettings,
  isUsingSupabase,
} from "@/lib/database"
import { Contact, ResearchItem, Interaction, Settings } from "@/lib/types"

// Contacts hook
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getContacts()
      setContacts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async (contact: Omit<Contact, "id" | "created_at" | "updated_at">) => {
    const newContact = await createContact(contact)
    setContacts((prev) => [newContact, ...prev])
    return newContact
  }

  const update = async (id: string, updates: Partial<Contact>) => {
    const updated = await updateContact(id, updates)
    if (updated) {
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }
    return updated
  }

  const remove = async (id: string) => {
    await deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  return { contacts, loading, error, reload: load, add, update, remove }
}

// Single contact hook
export function useContact(id: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [research, setResearch] = useState<ResearchItem[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [contactData, researchData, interactionsData] = await Promise.all([
        getContact(id),
        getResearchItems(id),
        getInteractions(id),
      ])
      setContact(contactData)
      setResearch(researchData)
      setInteractions(interactionsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const update = async (updates: Partial<Contact>) => {
    const updated = await updateContact(id, updates)
    if (updated) {
      setContact(updated)
    }
    return updated
  }

  const addResearch = async (item: Omit<ResearchItem, "id" | "created_at">) => {
    const newItem = await createResearchItem(item)
    setResearch((prev) => [newItem, ...prev])
    return newItem
  }

  const addInteraction = async (interaction: Omit<Interaction, "id" | "created_at">) => {
    const newItem = await createInteraction(interaction)
    setInteractions((prev) => [newItem, ...prev])

    // Update local contact state if it affects last_contacted_at
    if (["outreach", "meeting", "call", "response"].includes(interaction.type) && contact) {
      setContact({
        ...contact,
        last_contacted_at: interaction.occurred_at,
      })
    }

    return newItem
  }

  const editInteraction = async (interactionId: string, updates: Partial<Interaction>) => {
    const updated = await updateInteraction(interactionId, updates)
    if (updated) {
      setInteractions((prev) =>
        prev.map((i) => (i.id === interactionId ? updated : i))
      )
    }
    return updated
  }

  const removeInteraction = async (interactionId: string) => {
    await deleteInteraction(interactionId)
    setInteractions((prev) => prev.filter((i) => i.id !== interactionId))
  }

  return {
    contact,
    research,
    interactions,
    loading,
    error,
    reload: load,
    update,
    addResearch,
    addInteraction,
    editInteraction,
    removeInteraction,
  }
}

// Settings hook
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then((data) => {
      setSettings(data)
      setLoading(false)
    })
  }, [])

  const update = async (updates: Partial<Settings>) => {
    const updated = await updateSettings(updates)
    setSettings(updated)
    return updated
  }

  return { settings, loading, update, isUsingSupabase: isUsingSupabase() }
}

// Research hook for fetching new data
export function useResearch(contactId: string) {
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = async (searchTerms: string[]) => {
    setFetching(true)
    setError(null)
    try {
      const response = await fetch("/api/research/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerms.join(", "),
          contactId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      // Save each article as a research item
      const items: ResearchItem[] = []
      for (const article of result.data.articles || []) {
        const item = await createResearchItem(article)
        items.push(item)
      }
      return items
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch news")
      return []
    } finally {
      setFetching(false)
    }
  }

  const fetchLinkedIn = async (linkedinUrl: string) => {
    setFetching(true)
    setError(null)
    try {
      const response = await fetch("/api/research/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl,
          contactId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      // Save research items
      const items: ResearchItem[] = []
      for (const item of result.data.research_items || []) {
        const saved = await createResearchItem(item)
        items.push(saved)
      }
      return { profile: result.data.profile, items }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch LinkedIn")
      return { profile: null, items: [] }
    } finally {
      setFetching(false)
    }
  }

  const fetchTwitter = async (twitterHandle: string) => {
    setFetching(true)
    setError(null)
    try {
      const response = await fetch("/api/research/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: twitterHandle,
          contactId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      const items: ResearchItem[] = []
      for (const item of result.data.items || []) {
        const saved = await createResearchItem(item)
        items.push(saved)
      }
      return items
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Twitter")
      return []
    } finally {
      setFetching(false)
    }
  }

  const fetchRSS = async (feedUrl: string) => {
    setFetching(true)
    setError(null)
    try {
      const response = await fetch("/api/research/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl,
          contactId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      const items: ResearchItem[] = []
      for (const item of result.data.items || []) {
        const saved = await createResearchItem(item)
        items.push(saved)
      }
      return items
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch RSS")
      return []
    } finally {
      setFetching(false)
    }
  }

  const scrapeWebsite = async (url: string) => {
    setFetching(true)
    setError(null)
    try {
      const response = await fetch("/api/research/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          contactId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      if (result.data.item) {
        const saved = await createResearchItem(result.data.item)
        return saved
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape website")
      return null
    } finally {
      setFetching(false)
    }
  }

  return {
    fetching,
    error,
    fetchNews,
    fetchLinkedIn,
    fetchTwitter,
    fetchRSS,
    scrapeWebsite,
  }
}
