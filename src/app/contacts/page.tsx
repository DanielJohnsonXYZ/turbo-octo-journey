"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Plus, Filter, Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getContacts } from "@/lib/store"
import { Contact } from "@/lib/types"
import { daysSince, getInitials, getPriorityColor } from "@/lib/utils"

type FilterType = "all" | "high" | "medium" | "low" | "friends" | "professional" | "archived"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const allContacts = getContacts()
    setContacts(allContacts)
    setLoading(false)
  }, [])

  useEffect(() => {
    let result = [...contacts]

    // Apply filter
    switch (filter) {
      case "high":
        result = result.filter((c) => c.priority === "high" && !c.is_archived)
        break
      case "medium":
        result = result.filter((c) => c.priority === "medium" && !c.is_archived)
        break
      case "low":
        result = result.filter((c) => c.priority === "low" && !c.is_archived)
        break
      case "friends":
        result = result.filter((c) => c.is_friend && !c.is_archived)
        break
      case "professional":
        result = result.filter((c) => c.is_professional && !c.is_archived)
        break
      case "archived":
        result = result.filter((c) => c.is_archived)
        break
      default:
        result = result.filter((c) => !c.is_archived)
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.associations?.some((a) => a.toLowerCase().includes(searchLower)) ||
          c.location?.toLowerCase().includes(searchLower) ||
          c.notes?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by last contacted (oldest first to show who needs contact)
    result.sort((a, b) => {
      const daysA = daysSince(a.last_contacted_at) ?? 999
      const daysB = daysSince(b.last_contacted_at) ?? 999
      return daysB - daysA
    })

    setFilteredContacts(result)
  }, [contacts, search, filter])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            {filteredContacts.length} of {contacts.length} contacts
          </p>
        </div>
        <Link href="/import">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Import Contacts
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Active</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
            <SelectItem value="friends">Friends</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {contacts.length === 0
                ? "No contacts yet. Import your contacts to get started."
                : "No contacts match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => {
            const days = daysSince(contact.last_contacted_at)
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/contacts/${contact.id}`}>
                          <CardTitle className="text-base hover:underline cursor-pointer">
                            {contact.name}
                          </CardTitle>
                        </Link>
                        {contact.location && (
                          <p className="text-sm text-muted-foreground">{contact.location}</p>
                        )}
                      </div>
                    </div>
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {contact.priority && (
                      <Badge variant="outline" className={getPriorityColor(contact.priority)}>
                        {contact.priority}
                      </Badge>
                    )}
                    {contact.is_friend && <Badge variant="secondary">Friend</Badge>}
                    {contact.associations?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Last contacted */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {days !== null ? (
                      <span className={days > 90 ? "text-orange-500" : ""}>
                        {days} days since contact
                      </span>
                    ) : (
                      <span>Never contacted</span>
                    )}
                  </div>

                  {/* Notes preview */}
                  {contact.last_update_notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {contact.last_update_notes}
                    </p>
                  )}

                  {/* Action */}
                  <Link href={`/contacts/${contact.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
