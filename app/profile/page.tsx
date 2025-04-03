"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star, LogOut, Upload, Loader2, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { 
  getProfile, 
  updateProfile, 
  uploadAvatar, 
  getFollowers,
  getFollowing,
  type Profile 
} from "@/lib/profile-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserPhotos, deletePhoto, type Photo } from "@/lib/photo-service"
import Link from "next/link"
import { getUserStats } from "@/lib/rating-service"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { PhotoCard } from "@/components/photo-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Sheet, 
  SheetClose, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"

type UserStats = {
  totalUploads: number
  totalRatings: number
  averageRatingGiven: number
  averageRatingReceived: number
  ratingDistribution: {
    '9-10': number
    '7-8': number
    '5-6': number
    '1-4': number
  }
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const [userPhotos, setUserPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  
  const [followers, setFollowers] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Profile[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  
  // Add state for modals/sheets and form visibility
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  
  // Fetch profile data when component mounts
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      try {
        setLoading(true)
        console.log("Loading profile for user:", user.id)
        const profileData = await getProfile(user.id)
        
        if (profileData) {
          console.log("Profile loaded:", profileData)
          // Handle case where profileData might be an array
          const profile = Array.isArray(profileData) ? profileData[0] : profileData
          setProfile(profile)
          setUsername(profile.username || "")
          setFullName(profile.full_name || "")
          setBio(profile.bio || "")
        } else {
          console.error("No profile found for user:", user.id)
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user])
  
  // Load user's photos
  useEffect(() => {
    async function loadPhotos() {
      if (!user) return
      
      try {
        setLoadingPhotos(true)
        const photos = await getUserPhotos(user.id)
        setUserPhotos(photos || [])
      } catch (err) {
        console.error("Error loading photos:", err)
      } finally {
        setLoadingPhotos(false)
      }
    }
    
    loadPhotos()
  }, [user])
  
  // Load user stats
  useEffect(() => {
    async function loadStats() {
      if (!user) return
      
      try {
        setLoadingStats(true)
        const userStats = await getUserStats(user.id)
        setStats(userStats)
      } catch (err) {
        console.error("Error loading stats:", err)
      } finally {
        setLoadingStats(false)
      }
    }
    
    loadStats()
  }, [user])
  
  // Load followers and following
  useEffect(() => {
    async function loadSocial() {
      if (!user) return
      
      try {
        setLoadingFollowers(true)
        const [userFollowers, userFollowing] = await Promise.all([
          getFollowers(user.id),
          getFollowing(user.id)
        ])
        
        setFollowers(userFollowers || [])
        setFollowing(userFollowing || [])
      } catch (err) {
        console.error("Error loading social data:", err)
      } finally {
        setLoadingFollowers(false)
      }
    }
    
    loadSocial()
  }, [user])
  
  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file (JPEG, PNG, etc.)");
        return;
      }
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large (max 5MB)");
        return;
      }
      
      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Handle profile update form submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    setUpdating(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Update profile information
      const { success: profileSuccess, error: profileError } = await updateProfile(user.id, {
      username,
        full_name: fullName,
        bio
      })
      
      if (!profileSuccess) {
        throw profileError || new Error("Failed to update profile")
      }
      
      // Upload avatar if a new one was selected
      if (avatarFile) {
        const { success, error } = await uploadAvatar(user.id, avatarFile)
        
        if (!success) {
          throw error || new Error("Failed to upload avatar")
        }
      }
      
      // Reload the profile data
      const updatedProfile = await getProfile(user.id)
      if (updatedProfile) {
        setProfile(updatedProfile)
        setUsername(updatedProfile.username || "")
        setFullName(updatedProfile.full_name || "")
        setBio(updatedProfile.bio || "")
      }
      
      setSuccess("Profile updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setUpdating(false)
    }
  }
  
  // Handle photo deletion
  const handleDeletePhoto = async (photoId: string) => {
    if (!user) {
      return
    }
    
    try {
      const success = await deletePhoto(photoId, user.id)
      
      if (success) {
        // Remove the deleted photo from the state
        setUserPhotos(prev => prev.filter(photo => photo.id !== photoId))
      } else {
        setError("Failed to delete photo")
      }
    } catch (err) {
      console.error("Error deleting photo:", err)
      setError("An error occurred while deleting the photo")
    }
  }
  
  // Handle sign out
  const handleSignOut = () => {
    try {
      signOut()
    } catch (err) {
      console.error("Error signing out:", err)
      setError("Failed to sign out")
    }
  }
  
  if (loading) {
    return (
      <div className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          
          <Skeleton className="h-12 mb-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (!user || !profile) {
    return (
      <div className="container py-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <p className="mb-6">Please sign in to view your profile</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 px-4 md:px-0">
      <div className="max-w-4xl mx-auto">
        {/* Instagram-style profile header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-6 pb-6 border-b">
          {/* Larger avatar on the left */}
          <div className="md:w-1/3 flex justify-center">
            <Avatar className="w-32 h-32 md:w-36 md:h-36 border-2 border-white shadow">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.username || "Profile"} />
              <AvatarFallback>{profile.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </div>
          
          {/* Profile info on the right */}
          <div className="md:w-2/3 w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <h1 className="text-xl font-semibold">{profile.username || "User"}</h1>
              <Button className="w-full md:w-auto" size="sm" asChild>
                <Link href="/upload">Upload Photo</Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full md:w-auto"
                onClick={() => setShowProfileForm(!showProfileForm)}
              >
                Edit Profile
              </Button>
            </div>
            
            {/* Stats row - made clickable */}
            <div className="flex items-center gap-8 my-4">
              <div className="text-center md:text-left">
                <span className="font-semibold">{userPhotos.length}</span>{" "}
                <span className="text-sm text-gray-500">posts</span>
              </div>
              <button 
                className="text-center md:text-left cursor-pointer hover:opacity-80 bg-transparent border-none p-0"
                onClick={() => setShowFollowers(true)}
              >
                <span className="font-semibold">{profile.followers_count || 0}</span>{" "}
                <span className="text-sm text-gray-500">followers</span>
              </button>
              <button 
                className="text-center md:text-left cursor-pointer hover:opacity-80 bg-transparent border-none p-0"
                onClick={() => setShowFollowing(true)}
              >
                <span className="font-semibold">{profile.following_count || 0}</span>{" "}
                <span className="text-sm text-gray-500">following</span>
              </button>
            </div>
            
            {/* Full name and bio */}
            <div>
              {profile.full_name && (
                <p className="font-semibold text-sm">{profile.full_name}</p>
              )}
              {profile.bio && (
                <p className="text-sm mt-1">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form Section - Conditional Rendering */}
        {showProfileForm && (
          <div className="mb-8 border rounded-lg p-6 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Profile</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowProfileForm(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarPreview || profile.avatar_url || ""} alt={profile.username || "User"} />
                  <AvatarFallback>{profile.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>

                  <div>
                  <Label htmlFor="avatar" className="block mb-2">Profile Photo</Label>
                  <Input 
                    id="avatar" 
                    type="file" 
                    accept="image/*"
                    className="max-w-xs"
                    onChange={handleAvatarChange}
                  />
                  </div>
                  </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required
                  />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  rows={3} 
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => {
                  // Reset form to current profile values
                  setUsername(profile?.username || "")
                  setFullName(profile?.full_name || "")
                  setBio(profile?.bio || "")
                  setAvatarFile(null)
                  setAvatarPreview(null)
                  setError(null)
                  setSuccess(null)
                  setShowProfileForm(false)
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-10 pt-6 border-t">
              <h3 className="font-semibold mb-4">Danger Zone</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
                <Button 
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  type="button"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Instagram-style tab bar - without settings */}
        <Tabs defaultValue="uploads" className="mb-4">
          <TabsList className="w-full justify-center border-b rounded-none bg-transparent">
            <TabsTrigger 
              value="uploads" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid-3x3"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:rounded-none data-[state=active]:shadow-none"
            >
              <Star className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uploads" className="mt-6">
            {loadingPhotos ? (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-none" />
                ))}
              </div>
            ) : userPhotos.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-medium mb-1">No uploads yet</h3>
                <p className="text-sm text-gray-500 mb-4">Share your progress photos with the community</p>
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload a Photo
                  </Link>
                </Button>
                    </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPhotos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    id={photo.id}
                    imageUrl={photo.image_url}
                    title={photo.title || ""}
                    description={photo.description || ""}
                    rating={photo.rating || 0}
                    votesCount={photo.votes_count || 0}
                    likesCount={photo.likes_count || 0}
                    commentsCount={photo.comments_count || 0}
                    username={profile.username || ""}
                    userAvatar={profile.avatar_url || ""}
                    userId={photo.user_id}
                    createdAt={photo.created_at}
                    showDeleteButton={true}
                    onDelete={() => handleDeletePhoto(photo.id)}
                        />
                      ))}
                    </div>
            )}
          </TabsContent>
          
          <TabsContent value="stats">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {loadingStats ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-40" />
                </div>
              ) : stats ? (
                <div>
                  {/* Header with title */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6 border-b">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                      <Star className="h-5 w-5 text-amber-500" fill="currentColor" />
                      Your Fitness Rating Stats
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Track your progress and community interaction</p>
                  </div>

                  {/* Main stats cards */}
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm border border-blue-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-blue-700">Uploads</span>
                          <Upload className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{stats.totalUploads || 0}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl shadow-sm border border-amber-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-amber-700">Avg. Rating</span>
                          <Star className="h-4 w-4 text-amber-500" fill="currentColor" />
                        </div>
                        <div className="text-2xl font-bold text-amber-900">{stats.averageRatingReceived.toFixed(1) || "0.0"}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl shadow-sm border border-green-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-green-700">Ratings Given</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{stats.totalRatings || 0}</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm border border-purple-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-purple-700">Rating Given</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">{stats.averageRatingGiven.toFixed(1) || "0.0"}</div>
                    </div>
                  </div>

                    {/* Rating distribution */}
                    <div className="mt-8 bg-white p-5 rounded-xl border shadow-sm">
                      <h3 className="font-medium mb-4 flex items-center gap-2 text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                        Rating Distribution
                      </h3>
                    <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium flex items-center">
                              <span className="w-12 inline-block">9-10</span>
                              <span className="text-amber-500">★★★★★</span>
                            </span>
                            <span className="text-sm font-medium text-gray-700">{stats.ratingDistribution['9-10']}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${stats.ratingDistribution['9-10']}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium flex items-center">
                              <span className="w-12 inline-block">7-8</span>
                              <span className="text-green-500">★★★★<span className="text-gray-300">★</span></span>
                            </span>
                            <span className="text-sm font-medium text-gray-700">{stats.ratingDistribution['7-8']}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.ratingDistribution['7-8']}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium flex items-center">
                              <span className="w-12 inline-block">5-6</span>
                              <span className="text-blue-500">★★★<span className="text-gray-300">★★</span></span>
                            </span>
                            <span className="text-sm font-medium text-gray-700">{stats.ratingDistribution['5-6']}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${stats.ratingDistribution['5-6']}%` }}></div>
                        </div>
                      </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium flex items-center">
                              <span className="w-12 inline-block">1-4</span>
                              <span className="text-orange-500">★★<span className="text-gray-300">★★★</span></span>
                            </span>
                            <span className="text-sm font-medium text-gray-700">{stats.ratingDistribution['1-4']}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${stats.ratingDistribution['1-4']}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Motivational text */}
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-600 italic">
                        Keep uploading and participating to improve your stats!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Star className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No stats available yet</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
                    Upload photos and rate others to start building your stats
                  </p>
                  <Button asChild size="sm">
                    <Link href="/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Photo
                    </Link>
                  </Button>
                </div>
              )}
          </div>
        </TabsContent>
        </Tabs>
        
        {/* Followers Dialog */}
        <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Followers</DialogTitle>
            </DialogHeader>
            {loadingFollowers ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                    </div>
            ) : followers.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No followers yet</p>
                        </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto p-1">
                <div className="space-y-2">
                  {followers.map(follower => (
                    <Link 
                      key={follower.username} 
                      href={`/users/${follower.username}`} 
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={follower.avatar_url || ""} alt={follower.username || "User"} />
                        <AvatarFallback>{follower.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{follower.username || "User"}</p>
                        {follower.full_name && (
                          <p className="text-xs text-gray-500 truncate">{follower.full_name}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                    </div>
                  </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Following Dialog */}
        <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Following</DialogTitle>
            </DialogHeader>
            {loadingFollowers ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : following.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">You're not following anyone yet</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto p-1">
                  <div className="space-y-2">
                  {following.map(followed => (
                    <Link 
                      key={followed.username} 
                      href={`/users/${followed.username}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={followed.avatar_url || ""} alt={followed.username || "User"} />
                        <AvatarFallback>{followed.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{followed.username || "User"}</p>
                        {followed.full_name && (
                          <p className="text-xs text-gray-500 truncate">{followed.full_name}</p>
                        )}
                    </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}