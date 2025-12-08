"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Clock,
  MapPin,
  Briefcase,
  Users,
  PlusCircle,
  Newspaper,
  Linkedin,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getContact,
  getResearchItems,
  getInteractions,
  createInteraction,
  createResearchItem,
  updateContact,
} from "@/lib/store"
import { Contact, ResearchItem, Interaction } from "@/lib/types"
import { formatDate, daysSince, getInitials, getPriorityColor } from "@/lib/utils"

interface GeneratedMessage {
  subject: string
  message: string
  talking_points: string[]
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [research, setResearch] = useState<ResearchItem[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [fetchingNews, setFetchingNews] = useState(false)
  const [fetchingLinkedIn, setFetchingLinkedIn] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null)
  const [editedMessage, setEditedMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [messageType, setMessageType] = useState<string>("check_in")
  const [newNote, setNewNote] = useState("")

  useEffect(() => {
    const loadData = () => {
      const contactData = getContact(resolvedParams.id)
      if (!contactData) {
        router.push("/contacts")
        return
      }
      setContact(contactData)
      setResearch(getResearchItems(resolvedParams.id))
      setInteractions(getInteractions(resolvedParams.id))
      setLoading(false)
    }
    loadData()
  }, [resolvedParams.id, router])

  const generateMessage = async () => {
    if (!contact) return

    setGenerating(true)
    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          research_items: research,
          recent_interactions: interactions.slice(0, 5),
          message_type: messageType,
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        setGeneratedMessage(result.data)
        setEditedMessage(result.data.message)
      }
    } catch (error) {
      console.error("Message generation failed:", error)
    } finally {
      setGenerating(false)
    }
  }

  const fetchNews = async () => {
    if (!contact) return

    setFetchingNews(true)
    try {
      // Build search query from contact info
      const searchTerms = [contact.name]
      if (contact.associations && contact.associations.length > 0) {
        searchTerms.push(...contact.associations.slice(0, 2))
      }

      const response = await fetch("/api/research/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchTerms.join(", "),
          contactId: contact.id,
        }),
      })

      const result = await response.json()

      if (result.success && result.data?.articles) {
        // Save research items to local storage
        result.data.articles.forEach((article: Omit<ResearchItem, "id" | "created_at">) => {
          createResearchItem(article)
        })
        // Refresh research list
        setResearch(getResearchItems(contact.id))
      }
    } catch (error) {
      console.error("News fetch failed:", error)
    } finally {
      setFetchingNews(false)
    }
  }

  const fetchLinkedIn = async () => {
    if (!contact?.linkedin_url) return

    setFetchingLinkedIn(true)
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

      if (result.success && result.data?.research_items) {
        result.data.research_items.forEach((item: Omit<ResearchItem, "id" | "created_at">) => {
          createResearchItem(item)
        })
        setResearch(getResearchItems(contact.id))
      }
    } catch (error) {
      console.error("LinkedIn fetch failed:", error)
    } finally {
      setFetchingLinkedIn(false)
    }
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(editedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const logOutreach = () => {
    if (!contact) return

    createInteraction({
      contact_id: contact.id,
      type: "outreach",
      channel: "email",
      content: editedMessage,
      outcome: null,
      sentiment: null,
      occurred_at: new Date().toISOString(),
    })

    updateContact(contact.id, {
      last_contacted_at: new Date().toISOString(),
    })

    setInteractions(getInteractions(contact.id))
    setContact(getContact(contact.id) || contact)
    setGeneratedMessage(null)
    setEditedMessage("")
  }

  const addNote = () => {
    if (!contact || !newNote.trim()) return

    createInteraction({
      contact_id: contact.id,
      type: "note",
      channel: "other",
      content: newNote,
      outcome: null,
      sentiment: null,
      occurred_at: new Date().toISOString(),
    })

    setInteractions(getInteractions(contact.id))
    setNewNote("")
  }

  if (loading || !contact) {
    return <div>Loading...</div>
  }

  const days = daysSince(contact.last_contacted_at)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">{getInitials(contact.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{contact.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {contact.priority && (
                        <Badge variant="outline" className={getPriorityColor(contact.priority)}>
                          {contact.priority}
                        </Badge>
                      )}
                      {contact.is_friend && <Badge variant="secondary">Friend</Badge>}
                      {contact.is_professional && <Badge variant="outline">Professional</Badge>}
                    </div>
                  </div>
                </div>
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {contact.location}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {days !== null ? (
                  <span className={days > 90 ? "text-orange-500" : ""}>
                    Last contact: {days} days ago ({formatDate(contact.last_contacted_at)})
                  </span>
                ) : (
                  <span className="text-muted-foreground">Never contacted</span>
                )}
              </div>

              {contact.associations && contact.associations.length > 0 && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {contact.associations.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {contact.relationship_value && contact.relationship_value.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {contact.relationship_value.map((value) => (
                      <Badge key={value} variant="secondary" className="text-xs">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {contact.communication_style && (
                <div>
                  <p className="text-sm font-medium mb-1">Communication Style</p>
                  <p className="text-sm text-muted-foreground">{contact.communication_style}</p>
                </div>
              )}

              {contact.how_we_met && (
                <div>
                  <p className="text-sm font-medium mb-1">How We Met</p>
                  <p className="text-sm text-muted-foreground">{contact.how_we_met}</p>
                </div>
              )}

              {contact.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{contact.notes}</p>
                </div>
              )}

              {contact.last_update_notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Last Update</p>
                  <p className="text-sm text-muted-foreground">{contact.last_update_notes}</p>
                </div>
              )}

              {contact.next_steps && (
                <div>
                  <p className="text-sm font-medium mb-1">Next Steps</p>
                  <p className="text-sm text-muted-foreground">{contact.next_steps}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={fetchNews}
                disabled={fetchingNews}
                variant="outline"
                className="w-full justify-start"
              >
                {fetchingNews ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Newspaper className="mr-2 h-4 w-4" />
                )}
                Fetch News
              </Button>
              <Button
                onClick={fetchLinkedIn}
                disabled={fetchingLinkedIn || !contact.linkedin_url}
                variant="outline"
                className="w-full justify-start"
              >
                {fetchingLinkedIn ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Linkedin className="mr-2 h-4 w-4" />
                )}
                Check LinkedIn
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Message & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Generator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Message Generator
                  </CardTitle>
                  <CardDescription>
                    Generate a personalized message based on your relationship and recent updates
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Message type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check_in">Check In</SelectItem>
                      <SelectItem value="congratulate">Congratulate</SelectItem>
                      <SelectItem value="ask">Ask Question</SelectItem>
                      <SelectItem value="share">Share Something</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={generateMessage} disabled={generating}>
                    {generating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {generatedMessage && (
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Subject/Opening:</p>
                  <p className="text-sm bg-muted p-2 rounded">{generatedMessage.subject}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Message:</p>
                  <Textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={copyToClipboard} variant="outline">
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <Button onClick={logOutreach}>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </Button>
                </div>

                {generatedMessage.talking_points && generatedMessage.talking_points.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Talking Points:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {generatedMessage.talking_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Research & History Tabs */}
          <Card>
            <Tabs defaultValue="research">
              <CardHeader>
                <TabsList>
                  <TabsTrigger value="research">
                    Research ({research.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History ({interactions.length})
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="research">
                <CardContent>
                  {research.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No research yet. Click "Fetch News" to find updates about this contact.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {research.map((item) => (
                        <div key={item.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{item.source}</Badge>
                                {item.source_name && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.source_name}
                                  </span>
                                )}
                                {item.importance_score && item.importance_score >= 8 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Important
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{item.title}</p>
                              {item.summary && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.summary}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(item.fetched_at)}
                              </p>
                            </div>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
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
              </TabsContent>

              <TabsContent value="history">
                <CardContent>
                  {/* Add note form */}
                  <div className="flex gap-2 mb-4">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={addNote} disabled={!newNote.trim()}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>

                  {interactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No interaction history yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interactions.map((item) => (
                        <div key={item.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{item.type}</Badge>
                            <Badge variant="secondary">{item.channel}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.occurred_at)}
                            </span>
                          </div>
                          {item.content && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.content}
                            </p>
                          )}
                          {item.outcome && (
                            <p className="text-sm mt-1">
                              <span className="font-medium">Outcome:</span> {item.outcome}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
