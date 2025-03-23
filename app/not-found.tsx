"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export default function NotFound() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  return (
    <div className="container flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you're looking for doesn't exist or has been moved.</p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href={user ? "/gallery" : "/"}>
            Go to {user ? "Gallery" : "Home"}
          </Link>
        </Button>
      </div>
    </div>
  )
} 