"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { importContacts } from "@/lib/store"
import { Contact, NotionContactImport } from "@/lib/types"

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  // Try to parse common date formats
  const formats = [
    // "31 July 2025" format
    /^(\d{1,2})\s+(\w+)\s+(\d{4})$/,
    // "July 31, 2025" format
    /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/,
    // "2025-07-31" format
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ]

  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  }

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      let year: number, month: number, day: number

      if (format === formats[0]) {
        // "31 July 2025"
        day = parseInt(match[1])
        month = months[match[2].toLowerCase()]
        year = parseInt(match[3])
      } else if (format === formats[1]) {
        // "July 31, 2025"
        month = months[match[1].toLowerCase()]
        day = parseInt(match[2])
        year = parseInt(match[3])
      } else {
        // "2025-07-31"
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1
        day = parseInt(match[3])
      }

      if (!isNaN(year) && month !== undefined && !isNaN(day)) {
        return new Date(year, month, day).toISOString()
      }
    }
  }

  // Try native Date parsing as fallback
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  return null
}

function parseBool(value: string | null | undefined): boolean {
  if (!value) return false
  const lower = value.toLowerCase().trim()
  return lower === "yes" || lower === "true" || lower === "1"
}

function parseAssociations(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split(",").map((s) => s.trim()).filter(Boolean)
}

function parsePriority(value: string | null | undefined): "high" | "medium" | "low" | null {
  if (!value) return null
  const lower = value.toLowerCase().trim()
  if (lower === "high") return "high"
  if (lower === "medium") return "medium"
  if (lower === "low") return "low"
  return null
}

function transformNotionContact(row: NotionContactImport): Omit<Contact, "id" | "created_at" | "updated_at"> {
  return {
    name: row.Name || "Unknown",
    email: null,
    linkedin_url: row.LinkedIn || null,
    location: row.Location || null,
    status: row.Status || null,
    priority: parsePriority(row.Priority),
    associations: parseAssociations(row.Associations),
    communication_style: row["Communication Style"] || null,
    how_we_met: row["How we met"] || null,
    relationship_value: parseAssociations(row.Value),
    is_professional: parseBool(row["Professional Contact"]),
    is_friend: parseBool(row.Friend),
    is_archived: parseBool(row.Archive),
    dont_need_to_contact: parseBool(row["Don't Need To Contact"]),
    last_contacted_at: parseDate(row["Last Contacted"]),
    next_contact_at: null,
    notes: null,
    next_steps: row["Next Steps"] || null,
    last_update_notes: row["Last Update?"] || null,
    contact_score: null,
  }
}

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Omit<Contact, "id" | "created_at" | "updated_at">[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setImported(false)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const contacts = (results.data as NotionContactImport[])
            .filter((row) => row.Name && row.Name.trim()) // Filter out empty rows
            .map(transformNotionContact)

          // Deduplicate by name
          const seen = new Set<string>()
          const unique = contacts.filter((c) => {
            const key = c.name.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })

          setPreview(unique)
        } catch (err) {
          setError("Failed to parse CSV. Please check the format.")
          console.error(err)
        }
      },
      error: (err) => {
        setError("Failed to read file: " + err.message)
      },
    })
  }, [])

  const handleImport = () => {
    if (preview.length === 0) return

    setImporting(true)
    try {
      importContacts(preview)
      setImported(true)
    } catch (err) {
      setError("Failed to import contacts")
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Contacts</h1>
        <p className="text-muted-foreground">
          Import your contacts from a Notion CSV export or similar format
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Export your Notion database to CSV and upload it here. The importer will automatically
            map the columns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">CSV files only</p>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expected Columns */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Columns</CardTitle>
          <CardDescription>
            Your CSV should have these column headers (they will be mapped automatically)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Name",
              "Status",
              "Associations",
              "Location",
              "Last Update?",
              "Last Contacted",
              "Professional Contact",
              "Communication Style",
              "How we met",
              "LinkedIn",
              "Next Steps",
              "Value",
              "Priority",
              "Archive",
              "Don't Need To Contact",
              "Friend",
            ].map((col) => (
              <Badge key={col} variant="outline">
                {col}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview ({preview.length} contacts)</span>
              {imported ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  Imported successfully!
                </div>
              ) : (
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : "Import All"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Tags</th>
                    <th className="text-left p-2">Last Contacted</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((contact, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-medium">{contact.name}</td>
                      <td className="p-2 text-muted-foreground">{contact.location || "-"}</td>
                      <td className="p-2">
                        {contact.priority ? (
                          <Badge variant="outline">{contact.priority}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {contact.associations?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.associations && contact.associations.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{contact.associations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {contact.last_contacted_at
                          ? new Date(contact.last_contacted_at).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="text-center text-muted-foreground py-4">
                  Showing first 50 of {preview.length} contacts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {imported && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">Contacts imported successfully!</h3>
                <p className="text-sm text-green-600">
                  Your {preview.length} contacts are now ready to manage.
                </p>
              </div>
              <Button onClick={() => router.push("/")} className="bg-green-600 hover:bg-green-700">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
