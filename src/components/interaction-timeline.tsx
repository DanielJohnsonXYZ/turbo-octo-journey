"use client"

import { useState } from "react"
import {
  Send,
  Reply,
  Calendar,
  Phone,
  StickyNote,
  Mail,
  Inbox,
  MessageCircle,
  UserPlus,
  Users,
  Share,
  Coffee,
  Handshake,
  HelpCircle,
  Gift,
  Trophy,
  Video,
  Smartphone,
  Hash,
  MoreHorizontal,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Twitter,
  Linkedin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Interaction, InteractionType, InteractionChannel } from "@/lib/types"
import { formatDate } from "@/lib/utils"

// Icon mapping
const TYPE_ICONS: Record<InteractionType, React.ComponentType<{ className?: string }>> = {
  outreach: Send,
  response: Reply,
  meeting: Calendar,
  call: Phone,
  note: StickyNote,
  email_sent: Mail,
  email_received: Inbox,
  linkedin_message: Linkedin,
  linkedin_connection: UserPlus,
  linkedin_comment: MessageCircle,
  twitter_mention: Twitter,
  introduction: Users,
  referral: Share,
  coffee_chat: Coffee,
  event: Calendar,
  collaboration: Handshake,
  favor_asked: HelpCircle,
  favor_given: Gift,
  milestone: Trophy,
}

const TYPE_COLORS: Record<InteractionType, string> = {
  outreach: "bg-blue-100 text-blue-700 border-blue-200",
  response: "bg-green-100 text-green-700 border-green-200",
  meeting: "bg-purple-100 text-purple-700 border-purple-200",
  call: "bg-orange-100 text-orange-700 border-orange-200",
  note: "bg-gray-100 text-gray-700 border-gray-200",
  email_sent: "bg-blue-100 text-blue-700 border-blue-200",
  email_received: "bg-green-100 text-green-700 border-green-200",
  linkedin_message: "bg-sky-100 text-sky-700 border-sky-200",
  linkedin_connection: "bg-sky-100 text-sky-700 border-sky-200",
  linkedin_comment: "bg-sky-100 text-sky-700 border-sky-200",
  twitter_mention: "bg-cyan-100 text-cyan-700 border-cyan-200",
  introduction: "bg-purple-100 text-purple-700 border-purple-200",
  referral: "bg-green-100 text-green-700 border-green-200",
  coffee_chat: "bg-amber-100 text-amber-700 border-amber-200",
  event: "bg-pink-100 text-pink-700 border-pink-200",
  collaboration: "bg-indigo-100 text-indigo-700 border-indigo-200",
  favor_asked: "bg-yellow-100 text-yellow-700 border-yellow-200",
  favor_given: "bg-emerald-100 text-emerald-700 border-emerald-200",
  milestone: "bg-amber-100 text-amber-700 border-amber-200",
}

const TYPE_LABELS: Record<InteractionType, string> = {
  outreach: "Outreach",
  response: "Response",
  meeting: "Meeting",
  call: "Call",
  note: "Note",
  email_sent: "Email Sent",
  email_received: "Email Received",
  linkedin_message: "LinkedIn Message",
  linkedin_connection: "LinkedIn Connected",
  linkedin_comment: "LinkedIn Comment",
  twitter_mention: "Twitter/X",
  introduction: "Introduction",
  referral: "Referral",
  coffee_chat: "Coffee Chat",
  event: "Event",
  collaboration: "Collaboration",
  favor_asked: "Favor Asked",
  favor_given: "Favor Given",
  milestone: "Milestone",
}

const CHANNEL_ICONS: Record<InteractionChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  linkedin: Linkedin,
  twitter: Twitter,
  whatsapp: MessageCircle,
  phone: Phone,
  video_call: Video,
  in_person: Users,
  slack: Hash,
  text: Smartphone,
  other: MoreHorizontal,
}

interface InteractionTimelineProps {
  interactions: Interaction[]
  onAdd: (interaction: Omit<Interaction, "id" | "created_at">) => Promise<void>
  onEdit: (id: string, updates: Partial<Interaction>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  contactId: string
}

export function InteractionTimeline({
  interactions,
  onAdd,
  onEdit,
  onDelete,
  contactId,
}: InteractionTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form state
  const [formType, setFormType] = useState<InteractionType>("note")
  const [formChannel, setFormChannel] = useState<InteractionChannel>("other")
  const [formSubject, setFormSubject] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formOutcome, setFormOutcome] = useState("")
  const [formSentiment, setFormSentiment] = useState<"positive" | "neutral" | "negative" | "">("")
  const [formFollowUp, setFormFollowUp] = useState(false)
  const [formFollowUpDate, setFormFollowUpDate] = useState("")
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFormType("note")
    setFormChannel("other")
    setFormSubject("")
    setFormContent("")
    setFormOutcome("")
    setFormSentiment("")
    setFormFollowUp(false)
    setFormFollowUpDate("")
    setFormDate(new Date().toISOString().split("T")[0])
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      await onAdd({
        contact_id: contactId,
        type: formType,
        channel: formChannel,
        subject: formSubject || null,
        content: formContent || null,
        outcome: formOutcome || null,
        sentiment: formSentiment || null,
        follow_up_needed: formFollowUp,
        follow_up_date: formFollowUpDate || null,
        tags: [],
        attachments: [],
        occurred_at: new Date(formDate).toISOString(),
      })
      resetForm()
      setShowAddForm(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Group interactions by date
  const groupedInteractions = interactions.reduce(
    (groups, interaction) => {
      const date = new Date(interaction.occurred_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(interaction)
      return groups
    },
    {} as Record<string, Interaction[]>
  )

  return (
    <div className="space-y-4">
      {/* Add Interaction Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Interaction History</h3>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          Add Interaction
        </Button>
      </div>

      {/* Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as InteractionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={formChannel} onValueChange={(v) => setFormChannel(v as InteractionChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="video_call">Video Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="text">Text/SMS</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                placeholder="Meeting topic, email subject, etc."
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What happened? Key points discussed..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Outcome (optional)</Label>
              <Input
                placeholder="What was the result?"
                value={formOutcome}
                onChange={(e) => setFormOutcome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select
                  value={formSentiment}
                  onValueChange={(v) => setFormSentiment(v as typeof formSentiment)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did it go?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Follow-up needed?</Label>
                <Select
                  value={formFollowUp ? "yes" : "no"}
                  onValueChange={(v) => setFormFollowUp(v === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formFollowUp && (
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={formFollowUpDate}
                  onChange={(e) => setFormFollowUpDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Save Interaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interaction?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This action cannot be undone. Are you sure you want to delete this interaction?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirmId) {
                  await onDelete(deleteConfirmId)
                  setDeleteConfirmId(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline */}
      {interactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No interactions yet. Start logging your communications!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedInteractions).map(([date, items]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                {date}
              </h4>
              <div className="space-y-3">
                {items.map((interaction) => {
                  const Icon = TYPE_ICONS[interaction.type] || StickyNote
                  const ChannelIcon = CHANNEL_ICONS[interaction.channel] || MoreHorizontal
                  const isExpanded = expandedIds.has(interaction.id)
                  const hasContent = interaction.content || interaction.outcome

                  return (
                    <div
                      key={interaction.id}
                      className="relative pl-8 pb-3 border-l-2 border-muted ml-2"
                    >
                      {/* Icon */}
                      <div
                        className={`absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center border ${TYPE_COLORS[interaction.type]}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

                      {/* Content */}
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={TYPE_COLORS[interaction.type]}>
                                {TYPE_LABELS[interaction.type]}
                              </Badge>
                              <Badge variant="secondary" className="gap-1">
                                <ChannelIcon className="h-3 w-3" />
                                {interaction.channel}
                              </Badge>
                              {interaction.sentiment === "positive" && (
                                <Badge className="bg-green-100 text-green-700">Positive</Badge>
                              )}
                              {interaction.sentiment === "negative" && (
                                <Badge className="bg-red-100 text-red-700">Negative</Badge>
                              )}
                              {interaction.follow_up_needed && (
                                <Badge className="bg-orange-100 text-orange-700 gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Follow-up
                                </Badge>
                              )}
                            </div>

                            {interaction.subject && (
                              <p className="font-medium mt-1">{interaction.subject}</p>
                            )}

                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(interaction.occurred_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            {hasContent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(interaction.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(interaction.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(interaction.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && hasContent && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {interaction.content && (
                              <p className="text-sm whitespace-pre-wrap">{interaction.content}</p>
                            )}
                            {interaction.outcome && (
                              <p className="text-sm">
                                <span className="font-medium">Outcome:</span> {interaction.outcome}
                              </p>
                            )}
                            {interaction.follow_up_date && (
                              <p className="text-sm text-orange-600">
                                <span className="font-medium">Follow-up:</span>{" "}
                                {formatDate(interaction.follow_up_date)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Preview when collapsed */}
                        {!isExpanded && interaction.content && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                            {interaction.content}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
