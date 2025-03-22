"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If no user is logged in, redirect to login page
    if (user === null) {
      router.push('/login')
    }
  }, [user, router])

  // Show nothing while checking authentication
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user is null, we're redirecting, so don't show anything
  if (user === null) {
    return null
  }

  // User is authenticated, show the protected content
  return <>{children}</>
} 