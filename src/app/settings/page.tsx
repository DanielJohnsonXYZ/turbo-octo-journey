"use client"

import { useEffect, useState } from "react"
import { Save, Key, Clock, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getSettings, updateSettings, clearAllData } from "@/lib/store"
import { Settings } from "@/lib/types"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

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

  if (!settings) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and preferences
        </p>
      </div>

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

# Required for database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
