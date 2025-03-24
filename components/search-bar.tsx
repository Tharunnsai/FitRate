"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { searchProfiles, type Profile } from "@/lib/profile-service"
import { Loader2, Search, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSelect?: (profile: Profile) => void
  autoFocus?: boolean
}

export function SearchBar({ 
  placeholder = "Search users...",
  className = "",
  onSelect,
  autoFocus = false
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Handle search
  useEffect(() => {
    const timerId = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true)
        const profiles = await searchProfiles(query)
        setResults(profiles)
        setLoading(false)
        setShowResults(true)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)
    
    return () => clearTimeout(timerId)
  }, [query])
  
  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) && 
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          className="w-full pl-9 pr-8"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9 p-0"
            onClick={() => {
              setQuery("")
              setResults([])
              setShowResults(false)
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg overflow-hidden max-h-[400px] overflow-y-auto"
        >
          {loading ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-3 px-4 text-sm text-gray-500">
              No users found
            </div>
          ) : (
            <>
              {results.map((profile) => (
                <div 
                  key={profile.id}
                  className="py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    if (onSelect) {
                      onSelect(profile)
                    } else {
                      router.push(`/users/${profile.username}`)
                    }
                    setShowResults(false)
                    setQuery("")
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>{profile.username?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{profile.username}</p>
                      {profile.full_name && (
                        <p className="text-xs text-gray-500 truncate">{profile.full_name}</p>
                      )}
                      <div className="flex gap-1 text-xs text-gray-500">
                        <span>{profile.followers_count} followers</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {query.trim().length >= 2 && (
                <div className="py-2 px-3 bg-gray-50 dark:bg-gray-700 text-center">
                  <Link 
                    href={`/discover?q=${encodeURIComponent(query)}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => {
                      setShowResults(false)
                    }}
                  >
                    See all results for "{query}"
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
} 