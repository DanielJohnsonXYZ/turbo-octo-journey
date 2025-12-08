"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  MessageSquare,
  ExternalLink,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { getContacts, getResearchItems, getInteractions, getSettings } from "@/lib/store"
import { Contact, ResearchItem, Interaction } from "@/lib/types"
import { formatDate, daysSince, getInitials, getPriorityColor } from "@/lib/utils"

interface PrioritizedContact {
  id: string
  score: number
  reason: string
  suggested_action: string
}

interface ContactWithContext extends Contact {
  research: ResearchItem[]
  lastInteraction: Interaction | null
  daysSinceContact: number | null
  priorityInfo?: PrioritizedContact
}

export default function Dashboard() {
  const [contacts, setContacts] = useState<ContactWithContext[]>([])
  const [prioritizedContacts, setPrioritizedContacts] = useState<ContactWithContext[]>([])
  const [loading, setLoading] = useState(true)
  const [prioritizing, setPrioritizing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    needsContact: 0,
    recentResearch: 0,
    highPriority: 0,
  })

  const loadData = useCallback(() => {
    const allContacts = getContacts()
    const allResearch = getResearchItems()
    const allInteractions = getInteractions()
    const settings = getSettings()

    // Build contacts with context
    const contactsWithContext: ContactWithContext[] = allContacts
      .filter((c) => !c.is_archived && !c.dont_need_to_contact)
      .map((contact) => {
        const research = allResearch.filter((r) => r.contact_id === contact.id)
        const interactions = allInteractions
          .filter((i) => i.contact_id === contact.id)
          .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

        return {
          ...contact,
          research,
          lastInteraction: interactions[0] || null,
          daysSinceContact: daysSince(contact.last_contacted_at),
        }
      })

    // Calculate stats
    const targetFrequency = (priority: string | null) => {
      switch (priority) {
        case "high":
          return settings.high_priority_frequency_days
        case "medium":
          return settings.medium_priority_frequency_days
        default:
          return settings.low_priority_frequency_days
      }
    }

    const needsContact = contactsWithContext.filter((c) => {
      const days = c.daysSinceContact
      if (days === null) return true
      return days > targetFrequency(c.priority)
    }).length

    const recentResearch = allResearch.filter((r) => {
      const fetchedAt = new Date(r.fetched_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return fetchedAt > weekAgo && !r.is_read
    }).length

    setStats({
      total: contactsWithContext.length,
      needsContact,
      recentResearch,
      highPriority: contactsWithContext.filter((c) => c.priority === "high").length,
    })

    setContacts(contactsWithContext)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const runPrioritization = async () => {
    if (contacts.length === 0) return

    setPrioritizing(true)
    try {
      const settings = getSettings()

      // Build maps for API
      const researchMap: Record<string, ResearchItem[]> = {}
      const interactionMap: Record<string, Interaction[]> = {}

      contacts.forEach((c) => {
        researchMap[c.id] = c.research
        interactionMap[c.id] = c.lastInteraction ? [c.lastInteraction] : []
      })

      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts,
          research_map: researchMap,
          interaction_map: interactionMap,
          settings: {
            high_priority_frequency_days: settings.high_priority_frequency_days,
            medium_priority_frequency_days: settings.medium_priority_frequency_days,
            low_priority_frequency_days: settings.low_priority_frequency_days,
          },
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        // Map priority info back to contacts
        const priorityMap = new Map<string, PrioritizedContact>(
          result.data.map((p: PrioritizedContact) => [p.id, p])
        )

        const prioritized = contacts
          .map((c) => ({
            ...c,
            priorityInfo: priorityMap.get(c.id),
          }))
          .filter((c): c is ContactWithContext & { priorityInfo: PrioritizedContact } =>
            c.priorityInfo !== undefined
          )
          .sort((a, b) => (b.priorityInfo.score || 0) - (a.priorityInfo.score || 0))

        setPrioritizedContacts(prioritized)
      }
    } catch (error) {
      console.error("Prioritization failed:", error)
    } finally {
      setPrioritizing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const displayContacts = prioritizedContacts.length > 0 ? prioritizedContacts : contacts.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Contact</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.needsContact}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriority}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Research</CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentResearch}</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Who to Contact</CardTitle>
              <CardDescription>
                {prioritizedContacts.length > 0
                  ? "AI-prioritized based on timing, news, and relationship value"
                  : "Run AI prioritization to get personalized recommendations"}
              </CardDescription>
            </div>
            <Button onClick={runPrioritization} disabled={prioritizing || contacts.length === 0}>
              {prioritizing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run AI Prioritization
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contacts yet.</p>
              <Link href="/import">
                <Button variant="outline" className="mt-4">
                  Import Contacts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {displayContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                        {contact.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {contact.priority && (
                          <Badge variant="outline" className={getPriorityColor(contact.priority)}>
                            {contact.priority}
                          </Badge>
                        )}
                        {contact.is_friend && (
                          <Badge variant="secondary">Friend</Badge>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {contact.daysSinceContact !== null
                            ? `${contact.daysSinceContact} days ago`
                            : "Never contacted"}
                        </span>
                      </div>
                      {contact.priorityInfo && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {contact.priorityInfo.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.priorityInfo && (
                      <div className="text-right mr-4">
                        <div className="text-sm font-medium">
                          Score: {contact.priorityInfo.score}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.priorityInfo.suggested_action}
                        </div>
                      </div>
                    )}
                    <Link href={`/contacts/${contact.id}`}>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </Link>
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Research */}
      {stats.recentResearch > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Research Updates</CardTitle>
            <CardDescription>News and updates about your contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {contacts
              .flatMap((c) =>
                c.research
                  .filter((r) => !r.is_read)
                  .slice(0, 2)
                  .map((r) => ({ ...r, contactName: c.name, contactId: c.id }))
              )
              .slice(0, 5)
              .map((research) => (
                <div key={research.id} className="flex items-start gap-4 py-3 border-b last:border-0">
                  <div className="flex-1">
                    <Link href={`/contacts/${research.contactId}`} className="font-medium hover:underline">
                      {research.contactName}
                    </Link>
                    <p className="text-sm">{research.title}</p>
                    {research.summary && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {research.summary.slice(0, 150)}...
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{research.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(research.fetched_at)}
                      </span>
                    </div>
                  </div>
                  {research.url && (
                    <a href={research.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
