"use client"

import { useState } from "react"
import {
  Newspaper,
  Linkedin,
  Twitter,
  Rss,
  Globe,
  RefreshCw,
  ExternalLink,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ResearchItem, Contact } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { deleteResearchItem, markResearchAsRead } from "@/lib/database"

interface ResearchPanelProps {
  contact: Contact
  research: ResearchItem[]
  onResearchUpdate: () => void
}

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  news: Newspaper,
  linkedin: Linkedin,
  twitter: Twitter,
  rss: Rss,
  web: Globe,
  manual: Globe,
  company: Globe,
}

const SOURCE_COLORS: Record<string, string> = {
  news: "bg-red-100 text-red-700",
  linkedin: "bg-blue-100 text-blue-700",
  twitter: "bg-sky-100 text-sky-700",
  rss: "bg-orange-100 text-orange-700",
  web: "bg-purple-100 text-purple-700",
  manual: "bg-gray-100 text-gray-700",
  company: "bg-green-100 text-green-700",
}

export function ResearchPanel({ contact, research, onResearchUpdate }: ResearchPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState("")
  const [showRssInput, setShowRssInput] = useState(false)
  const [rssUrl, setRssUrl] = useState(contact.rss_feed_url || "")

  const fetchNews = async () => {
    setLoading("news")
    setError(null)
    try {
      const searchTerms = [contact.name]
      if (contact.company) searchTerms.push(contact.company)
      if (contact.associations?.length) searchTerms.push(...contact.associations.slice(0, 2))

      const response = await fetch("/api/research/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerms.join(", "),
          contactId: contact.id,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onResearchUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch news")
    } finally {
      setLoading(null)
    }
  }

  const fetchLinkedIn = async () => {
    if (!contact.linkedin_url) {
      setError("No LinkedIn URL set for this contact")
      return
    }
    setLoading("linkedin")
    setError(null)
    try {
      const response = await fetch("/api/research/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: contact.linkedin_url,
          contactId: contact.id,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onResearchUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch LinkedIn")
    } finally {
      setLoading(null)
    }
  }

  const fetchTwitter = async () => {
    if (!contact.twitter_handle) {
      setError("No Twitter handle set for this contact")
      return
    }
    setLoading("twitter")
    setError(null)
    try {
      const response = await fetch("/api/research/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: contact.twitter_handle,
          contactId: contact.id,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onResearchUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Twitter")
    } finally {
      setLoading(null)
    }
  }

  const fetchRSS = async () => {
    if (!rssUrl) {
      setShowRssInput(true)
      return
    }
    setLoading("rss")
    setError(null)
    try {
      const response = await fetch("/api/research/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl: rssUrl,
          contactId: contact.id,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onResearchUpdate()
      setShowRssInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch RSS")
    } finally {
      setLoading(null)
    }
  }

  const scrapeWebsite = async () => {
    if (!customUrl) {
      setShowUrlInput(true)
      return
    }
    setLoading("web")
    setError(null)
    try {
      const response = await fetch("/api/research/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: customUrl,
          contactId: contact.id,
          contactName: contact.name,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      onResearchUpdate()
      setCustomUrl("")
      setShowUrlInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape website")
    } finally {
      setLoading(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    await markResearchAsRead(id)
    onResearchUpdate()
  }

  const handleDelete = async (id: string) => {
    await deleteResearchItem(id)
    onResearchUpdate()
  }

  const unreadCount = research.filter((r) => !r.is_read).length

  return (
    <div className="space-y-4">
      {/* Data Source Buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Fetch Research</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNews}
              disabled={loading === "news"}
              className="justify-start"
            >
              {loading === "news" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Newspaper className="mr-2 h-4 w-4" />
              )}
              News
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchLinkedIn}
              disabled={loading === "linkedin" || !contact.linkedin_url}
              className="justify-start"
            >
              {loading === "linkedin" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Linkedin className="mr-2 h-4 w-4" />
              )}
              LinkedIn
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchTwitter}
              disabled={loading === "twitter" || !contact.twitter_handle}
              className="justify-start"
            >
              {loading === "twitter" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Twitter className="mr-2 h-4 w-4" />
              )}
              Twitter/X
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => (rssUrl ? fetchRSS() : setShowRssInput(true))}
              disabled={loading === "rss"}
              className="justify-start"
            >
              {loading === "rss" ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rss className="mr-2 h-4 w-4" />
              )}
              RSS Feed
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUrlInput(true)}
            disabled={loading === "web"}
            className="w-full justify-start"
          >
            {loading === "web" ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            Scrape Custom URL
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* URL Input Dialog */}
      <Dialog open={showUrlInput} onOpenChange={setShowUrlInput}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scrape Website</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter a URL to extract information about {contact.name}. This could be their personal
              website, company page, or any article featuring them.
            </p>
            <Input
              placeholder="https://example.com/about"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlInput(false)}>
              Cancel
            </Button>
            <Button onClick={scrapeWebsite} disabled={!customUrl || loading === "web"}>
              {loading === "web" ? "Scraping..." : "Scrape"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RSS Input Dialog */}
      <Dialog open={showRssInput} onOpenChange={setShowRssInput}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add RSS Feed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter an RSS feed URL to monitor. This could be their blog, company news feed, or
              Medium publication.
            </p>
            <Input
              placeholder="https://example.com/feed.xml"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRssInput(false)}>
              Cancel
            </Button>
            <Button onClick={fetchRSS} disabled={!rssUrl || loading === "rss"}>
              {loading === "rss" ? "Fetching..." : "Fetch Feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Research Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">
            Research ({research.length})
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </h3>
        </div>

        {research.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No research yet. Use the buttons above to fetch updates.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {research.map((item) => {
              const Icon = SOURCE_ICONS[item.source] || Globe
              return (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg ${item.is_read ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={SOURCE_COLORS[item.source]}>
                          <Icon className="h-3 w-3 mr-1" />
                          {item.source}
                        </Badge>
                        {item.source_name && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.source_name}
                          </span>
                        )}
                        {item.importance_score && item.importance_score >= 8 && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                      {item.summary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.summary}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(item.fetched_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!item.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkRead(item.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
