"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Save, Key, Clock, Trash2, AlertCircle, User, MessageSquare, Plus, X, Calendar, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { getSettings, updateSettings, clearAllData } from "@/lib/store"
import { Settings, UserProfile } from "@/lib/types"

const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  role: null,
  communication_style: null,
  about: null,
  signature: null,
  sample_messages: [],
  avoid_phrases: [],
  preferred_openers: [],
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [newSampleMessage, setNewSampleMessage] = useState("")
  const [newAvoidPhrase, setNewAvoidPhrase] = useState("")
  const [newOpener, setNewOpener] = useState("")
  const [googleStatus, setGoogleStatus] = useState<"unknown" | "connected" | "error" | "not_connected">("unknown")
  const [googleError, setGoogleError] = useState<string | null>(null)

  useEffect(() => {
    setSettings(getSettings())

    // Check for OAuth callback results
    const connected = searchParams.get("google_connected")
    const error = searchParams.get("google_error")

    if (connected === "true") {
      setGoogleStatus("connected")
      // Clear URL params
      window.history.replaceState({}, "", "/settings")
    } else if (error) {
      setGoogleStatus("error")
      setGoogleError(decodeURIComponent(error))
      window.history.replaceState({}, "", "/settings")
    }

    // Check connection status from API
    fetch("/api/auth/google/status")
      .then(res => res.json())
      .then(data => {
        if (data.connected) {
          setGoogleStatus("connected")
        } else if (googleStatus === "unknown") {
          setGoogleStatus("not_connected")
        }
      })
      .catch(() => {
        if (googleStatus === "unknown") {
          setGoogleStatus("not_connected")
        }
      })
  }, [searchParams])

  const handleSave = () => {
    if (!settings) return
    updateSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearData = () => {
    clearAllData()
    window.location.reload()
  }

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!settings) return
    setSettings({
      ...settings,
      user_profile: {
        ...(settings.user_profile || DEFAULT_USER_PROFILE),
        ...updates,
      },
    })
  }

  const addSampleMessage = () => {
    if (!newSampleMessage.trim()) return
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      sample_messages: [...profile.sample_messages, newSampleMessage.trim()],
    })
    setNewSampleMessage("")
  }

  const removeSampleMessage = (index: number) => {
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      sample_messages: profile.sample_messages.filter((_, i) => i !== index),
    })
  }

  const addAvoidPhrase = () => {
    if (!newAvoidPhrase.trim()) return
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      avoid_phrases: [...profile.avoid_phrases, newAvoidPhrase.trim()],
    })
    setNewAvoidPhrase("")
  }

  const removeAvoidPhrase = (index: number) => {
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      avoid_phrases: profile.avoid_phrases.filter((_, i) => i !== index),
    })
  }

  const addOpener = () => {
    if (!newOpener.trim()) return
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      preferred_openers: [...profile.preferred_openers, newOpener.trim()],
    })
    setNewOpener("")
  }

  const removeOpener = (index: number) => {
    const profile = settings?.user_profile || DEFAULT_USER_PROFILE
    updateProfile({
      preferred_openers: profile.preferred_openers.filter((_, i) => i !== index),
    })
  }

  if (!settings) {
    return <div>Loading...</div>
  }

  const profile = settings.user_profile || DEFAULT_USER_PROFILE

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your profile, API keys, and preferences
        </p>
      </div>

      {/* Your Profile - Most Important for Natural Messages */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>
            This information helps AI generate messages that sound like YOU. The more detail you provide,
            the more natural your messages will feel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Your Name *</Label>
              <Input
                id="profile-name"
                placeholder="John Smith"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Your Role/Title</Label>
              <Input
                id="profile-role"
                placeholder="Founder at Acme, Product Manager, etc."
                value={profile.role || ""}
                onChange={(e) => updateProfile({ role: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-style">Your Communication Style</Label>
            <Input
              id="profile-style"
              placeholder="e.g., casual and friendly, professional but warm, direct and concise"
              value={profile.communication_style || ""}
              onChange={(e) => updateProfile({ communication_style: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Describe how you naturally write messages
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-about">About You (Background)</Label>
            <Textarea
              id="profile-about"
              placeholder="Brief background that might be relevant to your contacts - what you're working on, interests, etc."
              value={profile.about || ""}
              onChange={(e) => updateProfile({ about: e.target.value || null })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-signature">Email Signature</Label>
            <Input
              id="profile-signature"
              placeholder="Best, John"
              value={profile.signature || ""}
              onChange={(e) => updateProfile({ signature: e.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sample Messages - Critical for Voice Matching */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sample Messages (Your Voice)
          </CardTitle>
          <CardDescription>
            Paste 2-3 real messages you&apos;ve sent before. The AI will learn your writing style from these.
            This is the #1 way to make generated messages sound like you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.sample_messages.map((msg, index) => (
            <div key={index} className="relative bg-muted p-3 pr-10 rounded-lg text-sm">
              <button
                onClick={() => removeSampleMessage(index)}
                className="absolute top-2 right-2 p-1 hover:bg-background rounded"
              >
                <X className="h-4 w-4" />
              </button>
              &quot;{msg}&quot;
            </div>
          ))}
          <div className="space-y-2">
            <Textarea
              placeholder="Paste a real message you've sent to someone... (e.g., 'Hey Sarah! Saw your post about the product launch - congrats! Would love to hear how it went when you have time.')"
              value={newSampleMessage}
              onChange={(e) => setNewSampleMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={addSampleMessage} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Writing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Writing Preferences</CardTitle>
          <CardDescription>
            Fine-tune how messages are written
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preferred Openers */}
          <div className="space-y-2">
            <Label>Preferred Opening Styles</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How do you like to start messages? Add examples.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.preferred_openers.map((opener, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {opener}
                  <button onClick={() => removeOpener(index)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 'Hey [name]!', 'Quick question -', 'Thought of you when...'"
                value={newOpener}
                onChange={(e) => setNewOpener(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addOpener()}
              />
              <Button onClick={addOpener} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Phrases to Avoid */}
          <div className="space-y-2">
            <Label>Phrases to Avoid</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Words or phrases you never want in your messages
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.avoid_phrases.map((phrase, index) => (
                <Badge key={index} variant="destructive" className="gap-1">
                  {phrase}
                  <button onClick={() => removeAvoidPhrase(index)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 'Hope this finds you well', 'Just circling back', 'synergy'"
                value={newAvoidPhrase}
                onChange={(e) => setNewAvoidPhrase(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvoidPhrase()}
              />
              <Button onClick={addAvoidPhrase} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            These keys are stored in your browser&apos;s local storage. For production, configure them
            as environment variables on Vercel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropic">Anthropic API Key</Label>
            <Input
              id="anthropic"
              type="password"
              placeholder="sk-ant-api03-..."
              value={settings.anthropic_api_key || ""}
              onChange={(e) =>
                setSettings({ ...settings, anthropic_api_key: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for AI message generation. Get yours at{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newsapi">NewsAPI Key</Label>
            <Input
              id="newsapi"
              type="password"
              placeholder="Your NewsAPI key"
              value={settings.newsapi_key || ""}
              onChange={(e) =>
                setSettings({ ...settings, newsapi_key: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for fetching news about your contacts. Free tier at{" "}
              <a
                href="https://newsapi.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                newsapi.org
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxycurl">Proxycurl API Key</Label>
            <Input
              id="proxycurl"
              type="password"
              placeholder="Your Proxycurl key"
              value={settings.proxycurl_api_key || ""}
              onChange={(e) =>
                setSettings({ ...settings, proxycurl_api_key: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for LinkedIn profile monitoring. Sign up at{" "}
              <a
                href="https://proxycurl.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                proxycurl.com
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter Bearer Token</Label>
            <Input
              id="twitter"
              type="password"
              placeholder="Your Twitter API bearer token"
              value={settings.twitter_bearer_token || ""}
              onChange={(e) =>
                setSettings({ ...settings, twitter_bearer_token: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for Twitter/X monitoring. Get yours at{" "}
              <a
                href="https://developer.twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                developer.twitter.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to see meeting history with contacts and upcoming meetings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleStatus === "connected" ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Google Calendar connected</span>
            </div>
          ) : googleStatus === "error" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span>Connection failed: {googleError || "Unknown error"}</span>
              </div>
              <Button asChild>
                <a href="/api/auth/google">Try Again</a>
              </Button>
            </div>
          ) : googleStatus === "not_connected" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your calendar to automatically track meetings with your contacts.
                We only request read-only access.
              </p>
              <Button asChild>
                <a href="/api/auth/google">
                  <Calendar className="mr-2 h-4 w-4" />
                  Connect Google Calendar
                </a>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Checking connection status...</div>
          )}
          <p className="text-xs text-muted-foreground">
            Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.
            Set up OAuth in{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Cloud Console
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Contact Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Contact Frequency
          </CardTitle>
          <CardDescription>
            How often should you reach out to contacts based on their priority level?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="high-freq">High Priority</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="high-freq"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.high_priority_frequency_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      high_priority_frequency_days: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medium-freq">Medium Priority</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="medium-freq"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.medium_priority_frequency_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      medium_priority_frequency_days: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="low-freq">Low Priority</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="low-freq"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.low_priority_frequency_days}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      low_priority_frequency_days: parseInt(e.target.value) || 120,
                    })
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saved}>
          {saved ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will delete your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showClearConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                Are you sure? This will delete ALL your contacts, research, and interaction history.
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Yes, Delete Everything
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables Info */}
      <Card>
        <CardHeader>
          <CardTitle>Deploying to Vercel</CardTitle>
          <CardDescription>
            For production, set these environment variables in your Vercel project settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`# Required for AI features
ANTHROPIC_API_KEY=sk-ant-api03-...

# Required for news research
NEWSAPI_KEY=your-newsapi-key

# Optional: LinkedIn profile monitoring
PROXYCURL_API_KEY=your-proxycurl-key

# Optional: Twitter/X monitoring
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# Required for database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Calendar OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
