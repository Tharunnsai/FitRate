"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function NotFound() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading) {
      // Redirect to gallery for authenticated users
      // or to home page for unauthenticated users
      router.push(user ? '/gallery' : '/')
    }
  }, [user, loading, router])
  
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="mb-8">Redirecting you to the right place...</p>
      </div>
    </div>
  )
} 