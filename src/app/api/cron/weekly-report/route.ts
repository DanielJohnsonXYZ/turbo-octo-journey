import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

// Vercel Cron Job - runs weekly
// Configure in vercel.json: "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 9 * * 1" }]

export const runtime = "edge"
export const maxDuration = 60

interface Contact {
  id: string
  name: string
  email: string | null
  company: string | null
  priority: string | null
  relationship_type: string | null
  last_contacted_at: string | null
  next_contact_at: string | null
  last_meeting_date: string | null
  total_meetings: number
}

interface ResearchItem {
  id: string
  contact_id: string
  title: string
  source: string
  summary: string | null
  url: string | null
  fetched_at: string
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow without auth in development
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  const recipientEmail = process.env.REPORT_EMAIL

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  if (!resendApiKey) {
    return NextResponse.json({ error: "Resend API key not configured" }, { status: 500 })
  }

  if (!recipientEmail) {
    return NextResponse.json({ error: "REPORT_EMAIL not configured" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const resend = new Resend(resendApiKey)

  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get contacts that need outreach (overdue or due this week)
    const { data: overdueContacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("is_archived", false)
      .lt("next_contact_at", now.toISOString())
      .order("next_contact_at", { ascending: true })
      .limit(20) as { data: Contact[] | null }

    const { data: upcomingContacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("is_archived", false)
      .gte("next_contact_at", now.toISOString())
      .lt("next_contact_at", oneWeekFromNow.toISOString())
      .order("next_contact_at", { ascending: true })
      .limit(20) as { data: Contact[] | null }

    // Get high priority contacts not contacted in 30+ days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: neglectedHighPriority } = await supabase
      .from("contacts")
      .select("*")
      .eq("is_archived", false)
      .eq("priority", "high")
      .lt("last_contacted_at", thirtyDaysAgo.toISOString())
      .order("last_contacted_at", { ascending: true })
      .limit(10) as { data: Contact[] | null }

    // Get recent research/news items from the past week
    const { data: recentResearch } = await supabase
      .from("research_items")
      .select("*, contacts(name)")
      .gte("fetched_at", oneWeekAgo.toISOString())
      .order("importance_score", { ascending: false })
      .limit(15) as { data: (ResearchItem & { contacts: { name: string } })[] | null }

    // Get contacts with upcoming birthdays (next 14 days)
    const today = now.toISOString().slice(5, 10) // MM-DD format
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const futureDate = twoWeeksFromNow.toISOString().slice(5, 10)

    const { data: upcomingBirthdays } = await supabase
      .from("contacts")
      .select("id, name, birthday, company")
      .eq("is_archived", false)
      .not("birthday", "is", null)
      .gte("birthday", today)
      .lte("birthday", futureDate)
      .limit(10) as { data: { id: string; name: string; birthday: string; company: string | null }[] | null }

    // Build email HTML
    const emailHtml = generateEmailHtml({
      overdueContacts: overdueContacts || [],
      upcomingContacts: upcomingContacts || [],
      neglectedHighPriority: neglectedHighPriority || [],
      recentResearch: recentResearch || [],
      upcomingBirthdays: upcomingBirthdays || [],
      reportDate: now,
    })

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "RelationshipOS <reports@resend.dev>",
      to: recipientEmail,
      subject: `Weekly Relationship Report - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      html: emailHtml,
    })

    if (emailError) {
      console.error("Failed to send email:", emailError)
      return NextResponse.json({ error: "Failed to send email", details: emailError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stats: {
        overdueContacts: overdueContacts?.length || 0,
        upcomingContacts: upcomingContacts?.length || 0,
        neglectedHighPriority: neglectedHighPriority?.length || 0,
        recentResearch: recentResearch?.length || 0,
        upcomingBirthdays: upcomingBirthdays?.length || 0,
      },
    })
  } catch (error) {
    console.error("Weekly report error:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

function generateEmailHtml(data: {
  overdueContacts: Contact[]
  upcomingContacts: Contact[]
  neglectedHighPriority: Contact[]
  recentResearch: (ResearchItem & { contacts: { name: string } })[]
  upcomingBirthdays: { id: string; name: string; birthday: string; company: string | null }[]
  reportDate: Date
}) {
  const { overdueContacts, upcomingContacts, neglectedHighPriority, recentResearch, upcomingBirthdays, reportDate } = data

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const daysSince = (dateStr: string | null) => {
    if (!dateStr) return null
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Relationship Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #444; font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .card { background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .card-header { font-weight: 600; color: #1a1a1a; }
    .card-meta { font-size: 13px; color: #666; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; margin-left: 8px; }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-overdue { background: #fecaca; color: #b91c1c; }
    .empty { color: #999; font-style: italic; padding: 16px 0; }
    .news-item { border-left: 3px solid #3b82f6; padding-left: 12px; margin-bottom: 16px; }
    .news-title { font-weight: 500; color: #1a1a1a; }
    .news-meta { font-size: 12px; color: #666; margin-top: 4px; }
    .cta { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 24px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>Weekly Relationship Report</h1>
  <p class="subtitle">${reportDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>

  ${overdueContacts.length > 0 ? `
  <h2>Overdue Outreach (${overdueContacts.length})</h2>
  ${overdueContacts.slice(0, 10).map(c => `
    <div class="card">
      <div class="card-header">
        ${c.name}
        ${c.priority === "high" ? '<span class="badge badge-high">High Priority</span>' : ""}
        <span class="badge badge-overdue">Overdue</span>
      </div>
      <div class="card-meta">
        ${c.company ? `${c.company} · ` : ""}
        Last contact: ${formatDate(c.last_contacted_at)}
        ${daysSince(c.last_contacted_at) ? ` (${daysSince(c.last_contacted_at)} days ago)` : ""}
      </div>
    </div>
  `).join("")}
  ` : ""}

  ${upcomingContacts.length > 0 ? `
  <h2>Due This Week (${upcomingContacts.length})</h2>
  ${upcomingContacts.slice(0, 10).map(c => `
    <div class="card">
      <div class="card-header">
        ${c.name}
        ${c.priority === "high" ? '<span class="badge badge-high">High Priority</span>' : ""}
        ${c.priority === "medium" ? '<span class="badge badge-medium">Medium</span>' : ""}
      </div>
      <div class="card-meta">
        ${c.company ? `${c.company} · ` : ""}
        Due: ${formatDate(c.next_contact_at)}
      </div>
    </div>
  `).join("")}
  ` : ""}

  ${neglectedHighPriority.length > 0 ? `
  <h2>Neglected High Priority (${neglectedHighPriority.length})</h2>
  <p style="font-size: 14px; color: #666; margin-bottom: 16px;">High priority contacts not reached in 30+ days</p>
  ${neglectedHighPriority.map(c => `
    <div class="card">
      <div class="card-header">${c.name}</div>
      <div class="card-meta">
        ${c.company ? `${c.company} · ` : ""}
        Last contact: ${formatDate(c.last_contacted_at)} (${daysSince(c.last_contacted_at)} days ago)
      </div>
    </div>
  `).join("")}
  ` : ""}

  ${upcomingBirthdays.length > 0 ? `
  <h2>Upcoming Birthdays</h2>
  ${upcomingBirthdays.map(c => `
    <div class="card">
      <div class="card-header">${c.name}</div>
      <div class="card-meta">${c.company ? `${c.company} · ` : ""}Birthday: ${c.birthday}</div>
    </div>
  `).join("")}
  ` : ""}

  ${recentResearch.length > 0 ? `
  <h2>News About Your Contacts</h2>
  ${recentResearch.slice(0, 8).map(r => `
    <div class="news-item">
      <div class="news-title">${r.title}</div>
      <div class="news-meta">
        ${r.contacts?.name || "Unknown"} · ${r.source} · ${formatDate(r.fetched_at)}
      </div>
      ${r.summary ? `<p style="font-size: 13px; color: #555; margin: 8px 0 0 0;">${r.summary.slice(0, 150)}${r.summary.length > 150 ? "..." : ""}</p>` : ""}
    </div>
  `).join("")}
  ` : ""}

  ${overdueContacts.length === 0 && upcomingContacts.length === 0 && recentResearch.length === 0 ? `
  <p class="empty">No updates this week. Your relationships are in good shape!</p>
  ` : ""}

  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://turbo-octo-journey.vercel.app"}" class="cta">Open Dashboard</a>

  <div class="footer">
    <p>This is your weekly relationship report from RelationshipOS.</p>
    <p>To change email settings, update the REPORT_EMAIL environment variable.</p>
  </div>
</body>
</html>
  `
}
