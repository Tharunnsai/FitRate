"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { getProfile, type Profile } from "@/lib/profile-service"
import { SearchBar } from "@/components/search-bar"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"

export function SiteHeader() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  
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
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {showMobileSearch ? (
          <div className="w-full py-2 relative">
            <SearchBar 
              className="w-full" 
              placeholder="Search users..." 
              onSelect={() => setShowMobileSearch(false)}
              autoFocus={true}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-4 top-2"
              onClick={() => setShowMobileSearch(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
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
              <Link href="/discover" className="text-sm font-medium transition-colors hover:text-primary">
                Discover Users
              </Link>
            </nav>
            
            {/* Search Bar */}
            <div className="flex-1 mx-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 pl-10 text-sm focus:outline-none"
                />
                <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Search</span>
                </button>
              </form>
            </div>
            
            {/* Right side auth buttons */}
            <div className="flex items-center space-x-2">
              {/* Mobile search button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="md:hidden rounded-full hover:bg-primary/10 transition-colors"
                onClick={() => setShowMobileSearch(true)}
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
              
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
                  <Button variant="ghost" size="sm" onClick={() => signOut()} className="hidden md:flex">
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
        )}
      </div>
    </header>
  )
} 