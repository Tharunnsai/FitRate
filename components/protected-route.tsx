"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Show loading or nothing while checking authentication
  if (isLoading || !user) {
    return <div className="container flex items-center justify-center min-h-screen">Loading...</div>
  }

  return <>{children}</>
} 