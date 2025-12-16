import { NextRequest, NextResponse } from "next/server"

// Mutual Connections API
// Since LinkedIn's official API restricts connection data, this works by:
// 1. Cross-referencing your contacts list to find shared connections
// 2. Storing manually added mutual connection info
// 3. Using Proxycurl's "related profiles" feature when available

interface MutualConnection {
  id: string
  name: string
  relationship: string // "Both know", "Introduced by", etc.
  linkedinUrl: string | null
  context: string | null // "Met through X", "Works at same company"
}

interface ConnectionAnalysis {
  mutualConnections: MutualConnection[]
  sharedCompanies: string[] // Companies you both have connections at
  sharedGroups: string[] // Industry groups, alumni networks, etc.
  introductionPaths: string[] // "Ask X for intro" suggestions
  connectionStrength: "strong" | "moderate" | "weak" | "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const { contact_id, linkedin_url, all_contacts } = await request.json()

    if (!contact_id) {
      return NextResponse.json(
        { success: false, error: "Contact ID required" },
        { status: 400 }
      )
    }

    const mutualConnections: MutualConnection[] = []
    const sharedCompanies: string[] = []
    const sharedGroups: string[] = []
    const introductionPaths: string[] = []

    // If we have the contact's LinkedIn and our contacts list, find overlaps
    if (all_contacts && Array.isArray(all_contacts)) {
      // Find contacts who might know this person
      // Based on: same company, same associations, introduced them

      const targetContact = all_contacts.find((c: any) => c.id === contact_id)
      if (targetContact) {
        const targetCompany = targetContact.company?.toLowerCase()
        const targetAssociations = (targetContact.associations || []).map((a: string) =>
          a.toLowerCase()
        )

        for (const contact of all_contacts) {
          if (contact.id === contact_id) continue

          // Check for company overlap
          if (targetCompany && contact.company?.toLowerCase() === targetCompany) {
            sharedCompanies.push(contact.company)
            mutualConnections.push({
              id: contact.id,
              name: contact.name,
              relationship: "Same company",
              linkedinUrl: contact.linkedin_url,
              context: `Both at ${contact.company}`,
            })
            introductionPaths.push(`${contact.name} works at ${contact.company} - could introduce`)
          }

          // Check for association overlap (YC, Techstars, school, etc.)
          const contactAssociations = (contact.associations || []).map((a: string) =>
            a.toLowerCase()
          )
          const sharedAssoc = targetAssociations.filter((a: string) =>
            contactAssociations.includes(a)
          )

          if (sharedAssoc.length > 0) {
            sharedGroups.push(...sharedAssoc)
            if (!mutualConnections.find((m) => m.id === contact.id)) {
              mutualConnections.push({
                id: contact.id,
                name: contact.name,
                relationship: "Shared network",
                linkedinUrl: contact.linkedin_url,
                context: `Both connected to: ${sharedAssoc.join(", ")}`,
              })
            }
          }

          // Check if someone introduced you to this contact
          if (
            targetContact.how_we_met?.toLowerCase().includes(contact.name.toLowerCase()) ||
            targetContact.notes?.toLowerCase().includes(`intro by ${contact.name.toLowerCase()}`)
          ) {
            mutualConnections.push({
              id: contact.id,
              name: contact.name,
              relationship: "Introduced you",
              linkedinUrl: contact.linkedin_url,
              context: "Made the introduction",
            })
            introductionPaths.push(`${contact.name} introduced you - good for warm re-intro`)
          }
        }
      }
    }

    // Try to get related profiles from Proxycurl if we have LinkedIn URL
    if (linkedin_url && process.env.PROXYCURL_API_KEY) {
      try {
        const relatedUrl = new URL("https://nubela.co/proxycurl/api/v2/linkedin/profile/related")
        relatedUrl.searchParams.set("linkedin_profile_url", linkedin_url)

        const response = await fetch(relatedUrl.toString(), {
          headers: {
            Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          // Add related profiles as potential mutual connections
          // (These are people LinkedIn suggests as related, not confirmed mutuals)
          if (data.related_profiles) {
            for (const related of data.related_profiles.slice(0, 5)) {
              // Check if this related profile is in our contacts
              const matchingContact = all_contacts?.find(
                (c: any) => c.linkedin_url === related.linkedin_profile_url
              )
              if (matchingContact) {
                mutualConnections.push({
                  id: matchingContact.id,
                  name: matchingContact.name,
                  relationship: "LinkedIn suggests connection",
                  linkedinUrl: matchingContact.linkedin_url,
                  context: "LinkedIn algorithm suggests relationship",
                })
              }
            }
          }
        }
      } catch (err) {
        console.error("Related profiles fetch failed:", err)
        // Non-fatal, continue without this data
      }
    }

    // Calculate connection strength
    let connectionStrength: "strong" | "moderate" | "weak" | "unknown" = "unknown"
    if (mutualConnections.length >= 3) {
      connectionStrength = "strong"
    } else if (mutualConnections.length >= 1) {
      connectionStrength = "moderate"
    } else if (sharedCompanies.length > 0 || sharedGroups.length > 0) {
      connectionStrength = "weak"
    }

    const result: ConnectionAnalysis = {
      mutualConnections: mutualConnections.slice(0, 10),
      sharedCompanies: [...new Set(sharedCompanies)],
      sharedGroups: [...new Set(sharedGroups)],
      introductionPaths: [...new Set(introductionPaths)].slice(0, 5),
      connectionStrength,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Mutual connections error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to analyze connections" },
      { status: 500 }
    )
  }
}
