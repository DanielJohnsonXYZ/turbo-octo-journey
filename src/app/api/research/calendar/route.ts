import { NextRequest, NextResponse } from "next/server"

// Google Calendar API integration
// Fetches meetings with a specific contact from your calendar

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start: string
  end: string
  attendees: string[]
  location: string | null
  meetingLink: string | null
}

interface CalendarResponse {
  pastMeetings: CalendarEvent[]
  upcomingMeetings: CalendarEvent[]
  totalMeetings: number
  lastMeeting: CalendarEvent | null
  nextMeeting: CalendarEvent | null
}

export async function POST(request: NextRequest) {
  try {
    const { contact_name, contact_email, access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: "Google Calendar access token required" },
        { status: 400 }
      )
    }

    if (!contact_name && !contact_email) {
      return NextResponse.json(
        { success: false, error: "Contact name or email required" },
        { status: 400 }
      )
    }

    // Search for events containing the contact's name or email
    const searchQuery = contact_email || contact_name
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    // Fetch events from Google Calendar API
    const calendarUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    calendarUrl.searchParams.set("q", searchQuery)
    calendarUrl.searchParams.set("timeMin", oneYearAgo.toISOString())
    calendarUrl.searchParams.set("timeMax", oneYearFromNow.toISOString())
    calendarUrl.searchParams.set("singleEvents", "true")
    calendarUrl.searchParams.set("orderBy", "startTime")
    calendarUrl.searchParams.set("maxResults", "100")

    const response = await fetch(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Google Calendar API error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch calendar events" },
        { status: response.status }
      )
    }

    const data = await response.json()
    const events: CalendarEvent[] = (data.items || [])
      .filter((event: any) => {
        // Filter to events that actually involve this contact
        const attendeeEmails = (event.attendees || []).map((a: any) => a.email?.toLowerCase())
        const inTitle = event.summary?.toLowerCase().includes(contact_name?.toLowerCase())
        const inAttendees = contact_email && attendeeEmails.includes(contact_email.toLowerCase())
        const inDescription = event.description?.toLowerCase().includes(contact_name?.toLowerCase())

        return inTitle || inAttendees || inDescription
      })
      .map((event: any) => ({
        id: event.id,
        title: event.summary || "Untitled",
        description: event.description || null,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        attendees: (event.attendees || []).map((a: any) => a.email),
        location: event.location || null,
        meetingLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
      }))

    const pastMeetings = events.filter((e) => new Date(e.start) < now)
    const upcomingMeetings = events.filter((e) => new Date(e.start) >= now)

    const result: CalendarResponse = {
      pastMeetings: pastMeetings.slice(-10).reverse(), // Last 10 meetings, most recent first
      upcomingMeetings: upcomingMeetings.slice(0, 5), // Next 5 upcoming
      totalMeetings: events.length,
      lastMeeting: pastMeetings.length > 0 ? pastMeetings[pastMeetings.length - 1] : null,
      nextMeeting: upcomingMeetings.length > 0 ? upcomingMeetings[0] : null,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Calendar integration error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch calendar" },
      { status: 500 }
    )
  }
}
