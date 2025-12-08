"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Clock,
  MapPin,
  Briefcase,
  Users,
  Send,
  Edit2,
  Twitter,
  Linkedin,
  Globe,
  Building,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  getContact,
  getResearchItems,
  getInteractions,
  createInteraction,
  updateContact,
  updateInteraction,
  deleteInteraction,
} from "@/lib/database"
import { Contact, ResearchItem, Interaction, InteractionType, InteractionChannel } from "@/lib/types"
import { formatDate, daysSince, getInitials, getPriorityColor } from "@/lib/utils"
import { InteractionTimeline } from "@/components/interaction-timeline"
import { ResearchPanel } from "@/components/research-panel"

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
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null)
  const [editedMessage, setEditedMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const [messageType, setMessageType] = useState<string>("check_in")
  const [showEditContact, setShowEditContact] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Contact>>({})

  const loadData = useCallback(async () => {
    try {
      const [contactData, researchData, interactionsData] = await Promise.all([
        getContact(resolvedParams.id),
        getResearchItems(resolvedParams.id),
        getInteractions(resolvedParams.id),
      ])

      if (!contactData) {
        router.push("/contacts")
        return
      }

      setContact(contactData)
      setResearch(researchData)
      setInteractions(interactionsData)
      setEditForm(contactData)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, router])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(editedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const logOutreach = async () => {
    if (!contact) return

    await createInteraction({
      contact_id: contact.id,
      type: "outreach" as InteractionType,
      channel: "email" as InteractionChannel,
      subject: generatedMessage?.subject || null,
      content: editedMessage,
      outcome: null,
      follow_up_needed: false,
      follow_up_date: null,
      sentiment: null,
      tags: [],
      attachments: [],
      occurred_at: new Date().toISOString(),
    })

    await updateContact(contact.id, {
      last_contacted_at: new Date().toISOString(),
    })

    await loadData()
    setGeneratedMessage(null)
    setEditedMessage("")
  }

  const handleAddInteraction = async (interaction: Omit<Interaction, "id" | "created_at">) => {
    await createInteraction(interaction)
    const updatedInteractions = await getInteractions(resolvedParams.id)
    setInteractions(updatedInteractions)

    // Refresh contact to get updated last_contacted_at
    const updatedContact = await getContact(resolvedParams.id)
    if (updatedContact) setContact(updatedContact)
  }

  const handleEditInteraction = async (id: string, updates: Partial<Interaction>) => {
    await updateInteraction(id, updates)
    const updatedInteractions = await getInteractions(resolvedParams.id)
    setInteractions(updatedInteractions)
  }

  const handleDeleteInteraction = async (id: string) => {
    await deleteInteraction(id)
    const updatedInteractions = await getInteractions(resolvedParams.id)
    setInteractions(updatedInteractions)
  }

  const handleResearchUpdate = async () => {
    const updatedResearch = await getResearchItems(resolvedParams.id)
    setResearch(updatedResearch)
  }

  const handleSaveContact = async () => {
    if (!contact) return
    await updateContact(contact.id, editForm)
    const updated = await getContact(contact.id)
    if (updated) {
      setContact(updated)
      setEditForm(updated)
    }
    setShowEditContact(false)
  }

  if (loading || !contact) {
    return <div>Loading...</div>
  }

  const days = daysSince(contact.last_contacted_at)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setShowEditContact(true)}>
          <Edit2 className="h-4 w-4 mr-1" />
          Edit Contact
        </Button>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditContact} onOpenChange={setShowEditContact}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={editForm.company || ""}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={editForm.job_title || ""}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={editForm.location || ""}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={editForm.linkedin_url || ""}
                onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Twitter Handle</Label>
              <Input
                placeholder="@username"
                value={editForm.twitter_handle || ""}
                onChange={(e) => setEditForm({ ...editForm, twitter_handle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                placeholder="https://..."
                value={editForm.website_url || ""}
                onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>RSS Feed URL</Label>
              <Input
                placeholder="https://blog.example.com/feed"
                value={editForm.rss_feed_url || ""}
                onChange={(e) => setEditForm({ ...editForm, rss_feed_url: e.target.value })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Communication Style</Label>
              <Textarea
                value={editForm.communication_style || ""}
                onChange={(e) => setEditForm({ ...editForm, communication_style: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes || ""}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Next Steps</Label>
              <Textarea
                value={editForm.next_steps || ""}
                onChange={(e) => setEditForm({ ...editForm, next_steps: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContact(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveContact}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {(contact.job_title || contact.company) && (
                      <p className="text-sm text-muted-foreground">
                        {contact.job_title}
                        {contact.job_title && contact.company && " at "}
                        {contact.company}
                      </p>
                    )}
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Social Links */}
              <div className="flex flex-wrap gap-2">
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {contact.twitter_handle && (
                  <a
                    href={`https://twitter.com/${contact.twitter_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {contact.website_url && (
                  <a href={contact.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>

              {contact.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {contact.location}
                </div>
              )}

              {contact.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {contact.company}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {days !== null ? (
                  <span className={days > 90 ? "text-orange-500 font-medium" : ""}>
                    {days === 0
                      ? "Contacted today"
                      : days === 1
                        ? "Contacted yesterday"
                        : `${days} days since contact`}
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
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
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

          {/* Research Panel */}
          <ResearchPanel
            contact={contact}
            research={research}
            onResearchUpdate={handleResearchUpdate}
          />
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

          {/* Interaction Timeline */}
          <Card>
            <CardContent className="pt-6">
              <InteractionTimeline
                interactions={interactions}
                onAdd={handleAddInteraction}
                onEdit={handleEditInteraction}
                onDelete={handleDeleteInteraction}
                contactId={contact.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
