import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { Toaster } from "../components/ui/toaster"
import { ThemeProvider } from "../components/theme-provider"
import { QueryProvider } from "../components/query-provider"
import { AuthSessionProvider } from "../components/providers/session-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Excel-Style Expense Tracker",
  description: "Track and visualize your monthly expenses in a spreadsheet format",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
