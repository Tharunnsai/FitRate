"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Upload, Search, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  
  // Don't show nav on auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return null
  }
  
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 container">
        <Link href="/" className="font-bold text-xl mr-6">
          FitRate
        </Link>
        
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            // Authenticated navigation
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/gallery" className={pathname === "/gallery" ? "text-primary" : ""}>
                  <Home className="h-5 w-5" />
                  <span className="sr-only">Home</span>
                </Link>
              </Button>
              
              <Button variant="ghost" size="icon" asChild>
                <Link href="/search" className={pathname === "/search" ? "text-primary" : ""}>
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Link>
              </Button>
              
              <Button variant="ghost" size="icon" asChild>
                <Link href="/upload" className={pathname === "/upload" ? "text-primary" : ""}>
                  <Upload className="h-5 w-5" />
                  <span className="sr-only">Upload</span>
                </Link>
              </Button>
              
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile" className={pathname === "/profile" ? "text-primary" : ""}>
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
            </>
          ) : (
            // Unauthenticated navigation
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/gallery" className={pathname === "/gallery" ? "text-primary" : ""}>
                  <Home className="h-5 w-5" />
                  <span className="sr-only">Home</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 