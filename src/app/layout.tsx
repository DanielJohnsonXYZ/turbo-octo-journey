import type { Metadata } from "next"
import Link from "next/link"
import { Users, LayoutDashboard, Settings, Upload, Menu } from "lucide-react"
import "./globals.css"

export const metadata: Metadata = {
  title: "RelationshipOS",
  description: "AI-powered relationship management platform",
}

function NavLink({
  href,
  children,
  icon: Icon,
}: {
  href: string
  children: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{children}</span>
    </Link>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-background">
          {/* Navigation */}
          <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <Users className="h-5 w-5" />
                <span className="hidden xs:inline">RelationshipOS</span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink href="/" icon={LayoutDashboard}>
                  Dashboard
                </NavLink>
                <NavLink href="/contacts" icon={Users}>
                  Contacts
                </NavLink>
                <NavLink href="/import" icon={Upload}>
                  Import
                </NavLink>
                <NavLink href="/settings" icon={Settings}>
                  Settings
                </NavLink>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="container py-4 px-4 sm:py-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
