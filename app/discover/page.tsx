"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { searchProfiles, getPopularProfiles, type Profile } from "@/lib/profile-service"
import { SearchBar } from "@/components/search-bar"
import { ProfileCard } from "@/components/profile-card"
import { Loader2, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Create a separate component that uses useSearchParams
function DiscoverContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ""
  
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [popularProfiles, setPopularProfiles] = useState<Profile[]>([])
  const [suggestedProfiles, setSuggestedProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  
  // Run search if query is in URL
  useEffect(() => {
    async function performSearch() {
      if (initialQuery) {
        setLoading(true)
        const results = await searchProfiles(initialQuery)
        setSearchResults(results)
        setLoading(false)
      }
    }
    
    performSearch()
  }, [initialQuery])
  
  // Load popular and suggested profiles
  useEffect(() => {
    async function loadProfiles() {
      // Load popular profiles
      const popular = await getPopularProfiles(10)
      setPopularProfiles(popular)
      
      // Load a different set for suggestions (fewer results)
      const suggested = await getPopularProfiles(5)
      setSuggestedProfiles(suggested)
    }
    
    loadProfiles()
  }, [])
  
  // Update profiles when follow/unfollow
  const handleFollowChange = (profileId: string, following: boolean) => {
    // Update all profile lists with the new follow status
    const updateProfileList = (profiles: Profile[]) => 
      profiles.map(profile => 
        profile.id === profileId 
          ? { 
              ...profile, 
              followers_count: following 
                ? profile.followers_count + 1 
                : Math.max(0, profile.followers_count - 1) 
            } 
          : profile
      );
    
    setSearchResults(updateProfileList);
    setPopularProfiles(updateProfileList);
    setSuggestedProfiles(updateProfileList);
  }
  
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">Discover Users</h1>
      
      <SearchBar 
        placeholder="Search by username or name..." 
        className="max-w-xl mx-auto mb-8"
        autoFocus
      />
      
      <Tabs defaultValue={initialQuery ? "search" : "browse"}>
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse Users</TabsTrigger>
          <TabsTrigger value="search" disabled={!initialQuery}>
            Search Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="search">
          {!initialQuery ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500">Start searching to find users</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500">No users found for "{initialQuery}"</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map(profile => (
                <ProfileCard
                  key={profile.id}
                  id={profile.id}
                  username={profile.username}
                  fullName={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  bio={profile.bio}
                  followersCount={profile.followers_count}
                  followingCount={profile.following_count}
                  onFollowChange={(following) => handleFollowChange(profile.id, following)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="browse">
          <div className="space-y-10">
            {/* Popular Users Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Popular Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                {popularProfiles.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {popularProfiles.map(profile => (
                      <ProfileCard
                        key={profile.id}
                        id={profile.id}
                        username={profile.username}
                        fullName={profile.full_name}
                        avatarUrl={profile.avatar_url}
                        bio={profile.bio}
                        followersCount={profile.followers_count}
                        followingCount={profile.following_count}
                        onFollowChange={(following) => handleFollowChange(profile.id, following)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Suggested Users Section */}
            <Card>
              <CardHeader>
                <CardTitle>Suggested For You</CardTitle>
              </CardHeader>
              <CardContent>
                {suggestedProfiles.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {suggestedProfiles.map(profile => (
                      <ProfileCard
                        key={profile.id}
                        id={profile.id}
                        username={profile.username}
                        fullName={profile.full_name}
                        avatarUrl={profile.avatar_url}
                        bio={profile.bio}
                        followersCount={profile.followers_count}
                        followingCount={profile.following_count}
                        onFollowChange={(following) => handleFollowChange(profile.id, following)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Main component that wraps the content in Suspense
export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
} 