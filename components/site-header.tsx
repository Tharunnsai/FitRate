"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { getProfile, type Profile } from "@/lib/profile-service"

export function SiteHeader() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      const profileData = await getProfile(user.id)
      if (profileData) {
        setProfile(profileData)
      }
    }
    
    if (user) {
      loadProfile()
    }
  }, [user])
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          {/* Left side navigation */}
          <nav className="flex items-center space-x-4">
            <Link href="/" className="font-medium">
              Fitness Photo Rating
            </Link>
            <Link href="/gallery" className="text-sm">
              Gallery
            </Link>
            {user && (
              <Link href="/upload" className="text-sm">
                Upload
              </Link>
            )}
          </nav>
          
          {/* Right side auth buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || user.email || ""} />
                    <AvatarFallback>{profile?.full_name?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden md:inline-block">
                    {profile?.username || user.email?.split('@')[0] || "Profile"}
                  </span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium">
                  Sign In
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 