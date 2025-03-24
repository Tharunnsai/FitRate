import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { MainNav } from "@/components/main-nav"
import DefaultLayout from "./default-layout"
import { FloatingSearchButton } from "@/components/floating-search-button"

// Initialize the Inter font
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FitRate - Fitness Progress Tracker',
  description: 'Track and share your fitness journey with the community',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <MainNav />
            <DefaultLayout>
              <main>{children}</main>
            </DefaultLayout>
            <FloatingSearchButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
