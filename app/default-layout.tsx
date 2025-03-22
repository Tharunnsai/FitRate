"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  useEffect(() => {
    if (loading) return
    
    // If user is on the root path and authenticated, redirect to gallery
    if (user && pathname === '/') {
      router.push('/gallery')
    }
  }, [user, loading, pathname, router])
  
  return <>{children}</>
} 