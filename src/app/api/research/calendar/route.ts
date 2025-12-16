import { NextRequest, NextResponse } from "next/server"

// Google Calendar API integration
// Fetches meetings with a specific contact from ALL your calendars
// Looks back 1 year and forward 3 months

interface CalendarEvent {
  id: string
  calendarId: string
  calendarName: string
  title: string
  description: string | null
  start: string
  end: string
  attendees: string[]
  location: string | null
  meetingLink: string | null
  isRecurring: boolean
}

interface CalendarResponse {
  pastMeetings: CalendarEvent[]
  upcomingMeetings: CalendarEvent[]
  totalMeetings: number
  lastMeeting: CalendarEvent | null
  nextMeeting: CalendarEvent | null
  meetingsByMonth: Record<string, number>
  calendarsSearched: string[]
}

interface GoogleCalendar {
  id: string
  summary: string
  primary?: boolean
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

    // First, get list of all calendars
    const calendarListResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!calendarListResponse.ok) {
      const error = await calendarListResponse.text()
      console.error("Google Calendar list error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch calendar list" },
        { status: calendarListResponse.status }
      )
    }

    const calendarListData = await calendarListResponse.json()
    const calendars: GoogleCalendar[] = calendarListData.items || []

    // Filter to calendars we want to search (owned + subscribed, not holidays/birthdays)
    const searchableCalendars = calendars.filter((cal) => {
      const id = cal.id.toLowerCase()
      return (
        !id.includes("holiday") &&
        !id.includes("birthday") &&
        !id.includes("#contacts@group")
      )
    })

    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const searchQuery = contact_email || contact_name
    const allEvents: CalendarEvent[] = []
    const calendarsSearched: string[] = []

    // Search each calendar
    for (const calendar of searchableCalendars) {
      try {
        const calendarUrl = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`
        )
        calendarUrl.searchParams.set("q", searchQuery)
        calendarUrl.searchParams.set("timeMin", oneYearAgo.toISOString())
        calendarUrl.searchParams.set("timeMax", threeMonthsFromNow.toISOString())
        calendarUrl.searchParams.set("singleEvents", "true")
        calendarUrl.searchParams.set("orderBy", "startTime")
        calendarUrl.searchParams.set("maxResults", "250")

        const response = await fetch(calendarUrl.toString(), {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          calendarsSearched.push(calendar.summary)

          const events = (data.items || [])
            .filter((event: any) => {
              // More thorough filtering to ensure this is actually about the contact
              const attendeeEmails = (event.attendees || []).map((a: any) =>
                a.email?.toLowerCase()
              )
              const titleLower = event.summary?.toLowerCase() || ""
              const descLower = event.description?.toLowerCase() || ""
              const contactNameLower = contact_name?.toLowerCase() || ""
              const contactEmailLower = contact_email?.toLowerCase() || ""

              const inAttendees = contactEmailLower && attendeeEmails.includes(contactEmailLower)
              const inTitle = contactNameLower && titleLower.includes(contactNameLower)
              const inDescription = contactNameLower && descLower.includes(contactNameLower)

              return inAttendees || inTitle || inDescription
            })
            .map((event: any) => ({
              id: event.id,
              calendarId: calendar.id,
              calendarName: calendar.summary,
              title: event.summary || "Untitled",
              description: event.description || null,
              start: event.start?.dateTime || event.start?.date,
              end: event.end?.dateTime || event.end?.date,
              attendees: (event.attendees || []).map((a: any) => a.email),
              location: event.location || null,
              meetingLink:
                event.hangoutLink ||
                event.conferenceData?.entryPoints?.[0]?.uri ||
                null,
              isRecurring: !!event.recurringEventId,
            }))

          allEvents.push(...events)
        }
      } catch (err) {
        console.error(`Error fetching calendar ${calendar.summary}:`, err)
        // Continue with other calendars
      }
    }

    // Dedupe events (same event might appear in multiple calendars)
    const uniqueEvents = allEvents.reduce((acc, event) => {
      const key = `${event.start}-${event.title}`
      if (!acc.has(key)) {
        acc.set(key, event)
      }
      return acc
    }, new Map<string, CalendarEvent>())

    const events = Array.from(uniqueEvents.values()).sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    )

    const pastMeetings = events.filter((e) => new Date(e.start) < now)
    const upcomingMeetings = events.filter((e) => new Date(e.start) >= now)

    // Calculate meetings by month for trends
    const meetingsByMonth: Record<string, number> = {}
    for (const event of events) {
      const month = new Date(event.start).toISOString().slice(0, 7) // YYYY-MM
      meetingsByMonth[month] = (meetingsByMonth[month] || 0) + 1
    }

    const result: CalendarResponse = {
      pastMeetings: pastMeetings.reverse(), // Most recent first
      upcomingMeetings,
      totalMeetings: events.length,
      lastMeeting: pastMeetings.length > 0 ? pastMeetings[0] : null,
      nextMeeting: upcomingMeetings.length > 0 ? upcomingMeetings[0] : null,
      meetingsByMonth,
      calendarsSearched,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Calendar integration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch calendar",
      },
      { status: 500 }
    )
  }
}
