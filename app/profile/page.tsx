"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Star, LogOut, Upload, User, ImageIcon, Loader2 } from "lucide-react"
import { supabase } from '@/lib/supabase'
import { useAuth } from "@/lib/auth-context"
import { getProfile, updateProfile, uploadAvatar, type Profile } from "@/lib/profile-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getUserPhotos, deletePhoto, type Photo } from "@/lib/photo-service"
import Link from "next/link"
import { getUserActivities, type Activity, getUserStats } from "@/lib/rating-service"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

// Mock user uploads - we'll replace this with real data later
const mockUploads = [
  {
    id: 1,
    title: "3 Months Progress",
    imageUrl: "/placeholder.svg?height=400&width=300",
    rating: 8.4,
    votes: 24,
    date: "2023-12-15",
  },
  // ... other mock uploads
]

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
  const [uploads, setUploads] = useState(mockUploads)
  
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
  
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  
  // Fetch profile data when component mounts
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      
      setLoading(true)
      const profileData = await getProfile(user.id)
      
      if (profileData) {
        setProfile(profileData)
        setUsername(profileData.username || "")
        setFullName(profileData.full_name || "")
        setBio(profileData.bio || "")
      } else {
        // If no profile exists yet, create default values
        setUsername(user.email?.split('@')[0] || "")
        setFullName("")
        setBio("")
      }
      
      setLoading(false)
    }
    
    loadProfile()
  }, [user])
  
  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setAvatarFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return
    
    try {
      setUpdating(true)
      setError(null)
      setSuccess(null)
      
      // Upload avatar if a new one was selected
      if (avatarFile) {
        const { success, url, error } = await uploadAvatar(user.id, avatarFile)
        
        if (!success) {
          throw new Error(error.message || "Failed to upload avatar")
        }
      }
      
      // Update profile information
      const { success, error } = await updateProfile({
        id: user.id,
        username,
        full_name: fullName,
        bio
      })
      
      if (!success) {
        throw new Error(error.message || "Failed to update profile")
      }
      
      // Refresh profile data
      const updatedProfile = await getProfile(user.id)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }
      
      setSuccess("Profile updated successfully!")
      setAvatarFile(null)
      
    } catch (err: any) {
      setError(err.message || "An error occurred while updating your profile")
      console.error("Profile update error:", err)
    } finally {
      setUpdating(false)
    }
  }
  
  // Add this useEffect to load user photos
  useEffect(() => {
    async function loadUserPhotos() {
      if (!user) return
      
      setLoadingPhotos(true)
      const photos = await getUserPhotos(user.id)
      setUserPhotos(photos)
      setLoadingPhotos(false)
    }
    
    loadUserPhotos()
  }, [user])
  
  // Add a function to handle photo deletion
  const handleDeletePhoto = async (photoId: string) => {
    if (!user) return
    
    if (confirm("Are you sure you want to delete this photo?")) {
      const success = await deletePhoto(photoId, user.id)
      
      if (success) {
        // Remove the photo from the state
        setUserPhotos(userPhotos.filter(photo => photo.id !== photoId))
      }
    }
  }
  
  // Add this useEffect to load user activities
  useEffect(() => {
    async function loadUserActivities() {
      if (!user) return
      
      setLoadingActivities(true)
      const userActivities = await getUserActivities(user.id, 10)
      setActivities(userActivities)
      setLoadingActivities(false)
    }
    
    if (user) {
      loadUserActivities()
    }
  }, [user])
  
  // Add this useEffect to load user stats
  useEffect(() => {
    async function loadUserStats() {
      if (!user) return
      
      setLoadingStats(true)
      const userStats = await getUserStats(user.id)
      setStats(userStats)
      setLoadingStats(false)
    }
    
    if (user) {
      loadUserStats()
    }
  }, [user])
  
  // Show loading state
  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-12">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="uploads">My Uploads</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>View your profile information and stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-24 h-24 mb-4">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || user?.email || ""} />
                      <AvatarFallback>{profile?.full_name?.[0] || user?.email?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold">{profile?.full_name || username}</h2>
                    <p className="text-gray-500">@{profile?.username || "username"}</p>
                    
                    {bio && <p className="mt-4 text-sm">{bio}</p>}
                    
                    <div className="mt-6 w-full">
                      <h3 className="font-medium mb-2">Stats</h3>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-2xl font-bold">{stats?.totalUploads || 0}</p>
                          <p className="text-xs text-gray-500">Uploads</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-2xl font-bold">{stats?.totalRatings || 0}</p>
                          <p className="text-xs text-gray-500">Ratings</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-2xl font-bold">{stats?.averageRatingReceived || 0}</p>
                          <p className="text-xs text-gray-500">Avg. Received</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-2xl font-bold">{stats?.averageRatingGiven || 0}</p>
                          <p className="text-xs text-gray-500">Avg. Given</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-2/3">
                  <div className="mb-8">
                    <h3 className="font-medium mb-4">Rating Distribution</h3>
                    {loadingStats ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">9-10</span>
                            <span className="text-sm">{stats?.ratingDistribution['9-10']}%</span>
                          </div>
                          <Progress value={stats?.ratingDistribution['9-10'] || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">7-8</span>
                            <span className="text-sm">{stats?.ratingDistribution['7-8']}%</span>
                          </div>
                          <Progress value={stats?.ratingDistribution['7-8'] || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">5-6</span>
                            <span className="text-sm">{stats?.ratingDistribution['5-6']}%</span>
                          </div>
                          <Progress value={stats?.ratingDistribution['5-6'] || 0} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">1-4</span>
                            <span className="text-sm">{stats?.ratingDistribution['1-4']}%</span>
                          </div>
                          <Progress value={stats?.ratingDistribution['1-4'] || 0} className="h-2" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Recent Activity</h3>
                    {loadingActivities ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {activities.slice(0, 3).map((activity) => (
                          <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                            {activity.activity_type === 'rating' && (
                              <>
                                <Star className="h-5 w-5 text-yellow-500" />
                                <div>
                                  <p className="text-sm">You rated a photo {activity.rating}/10</p>
                                  <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                                </div>
                              </>
                            )}
                            {(
                              <>
                                <Star className="h-5 w-5 text-blue-500" />
                                <div>
                                  <p className="text-sm">Your photo received a {activity.rating}/10 rating from {activity.user_id}</p>
                                  <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                                </div>
                              </>
                            )}
                            {activity.activity_type === 'upload' && (
                              <>
                                <Upload className="h-5 w-5 text-blue-500" />
                                <div>
                                  <p className="text-sm">You uploaded a new photo</p>
                                  <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads">
          <Card>
            <CardHeader>
              <CardTitle>My Uploads</CardTitle>
              <CardDescription>Photos you've shared with the community</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPhotos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userPhotos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You haven't uploaded any photos yet</p>
                  <Button asChild>
                    <Link href="/upload">Upload Your First Photo</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square relative overflow-hidden rounded-md">
                        <Image
                          src={photo.image_url}
                          alt={photo.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium truncate">{photo.title}</h3>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-1 text-yellow-500" />
                            {photo.rating.toFixed(1)} ({photo.votes_count})
                          </div>
                          <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" className="text-white border-white hover:bg-white/20" asChild>
                          <Link href={`/gallery/${photo.id}`}>View</Link>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-400 border-red-400 hover:bg-red-400/20"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center mt-8">
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload New Photo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent interactions on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                      {activity.activity_type === 'rating' && (
                        <>
                          <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0">
                            <Image 
                              src={activity.photo?.image_url || "/placeholder.svg"} 
                              alt={activity.photo?.title || "Photo"} 
                              fill 
                              className="object-cover" 
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              You rated <span className="font-medium">{activity.photo?.title}</span>
                            </p>
                            <div className="flex items-center mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < Math.round(activity.rating! / 2) 
                                      ? "text-yellow-500 fill-yellow-500" 
                                      : "text-gray-300"
                                  }`} 
                                />
                              ))}
                              <span className="ml-1 text-xs text-gray-500">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {(
                        <>
                          <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0">
                            <Image 
                              src={activity.photo?.image_url || "/placeholder.svg"} 
                              alt={activity.photo?.title || "Photo"} 
                              fill 
                              className="object-cover" 
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              Your photo received a {activity.rating}/10 rating
                            </p>
                            <div className="flex items-center mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${
                                    i < Math.round(activity.rating! / 2) 
                                      ? "text-yellow-500 fill-yellow-500" 
                                      : "text-gray-300"
                                  }`} 
                                />
                              ))}
                              <span className="ml-1 text-xs text-gray-500">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Add other activity types here */}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" id="settings-tab">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={user?.email || ""} 
                      disabled 
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar">Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={avatarPreview || profile?.avatar_url || ""} 
                          alt={profile?.full_name || user?.email || ""} 
                        />
                        <AvatarFallback>
                          {profile?.full_name?.[0] || user?.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                        <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar')?.click()}>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)} 
                      rows={3} 
                    />
                  </div>
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
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                  <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

