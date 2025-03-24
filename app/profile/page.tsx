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
    <div className="container py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.avatar_url || ""} alt={profile.username || "Profile"} />
            <AvatarFallback>{profile.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{profile.username || "User"}</h1>
            <p className="text-gray-500">{profile.full_name || ""}</p>
            
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
              <div className="text-center">
                <div className="font-medium">{userPhotos.length}</div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{profile.followers_count || 0}</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{profile.following_count || 0}</div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
            </div>
            
            {profile.bio && (
              <p className="mt-2 text-sm">{profile.bio}</p>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="uploads">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="uploads">
            <Card>
              <CardHeader>
                <CardTitle>Your Uploads</CardTitle>
                <CardDescription>Photos you&apos;ve shared on FitRate</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPhotos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
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
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
                <CardDescription>Your activity statistics on FitRate</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-40" />
                  </div>
                ) : stats ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.totalUploads || 0}</div>
                        <div className="text-sm text-gray-500">Uploads</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.averageRatingReceived.toFixed(1) || "0.0"}</div>
                        <div className="text-sm text-gray-500">Avg. Rating Received</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.totalRatings || 0}</div>
                        <div className="text-sm text-gray-500">Ratings Given</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold">{stats.averageRatingGiven.toFixed(1) || "0.0"}</div>
                        <div className="text-sm text-gray-500">Avg. Rating Given</div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-4">Rating Distribution</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">9-10 ⭐⭐⭐⭐⭐</span>
                            <span className="text-sm">{stats.ratingDistribution['9-10']}%</span>
                          </div>
                          <Progress value={stats.ratingDistribution['9-10']} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">7-8 ⭐⭐⭐⭐</span>
                            <span className="text-sm">{stats.ratingDistribution['7-8']}%</span>
                          </div>
                          <Progress value={stats.ratingDistribution['7-8']} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">5-6 ⭐⭐⭐</span>
                            <span className="text-sm">{stats.ratingDistribution['5-6']}%</span>
                          </div>
                          <Progress value={stats.ratingDistribution['5-6']} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">1-4 ⭐⭐</span>
                            <span className="text-sm">{stats.ratingDistribution['1-4']}%</span>
                          </div>
                          <Progress value={stats.ratingDistribution['1-4']} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p>No stats available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Social Connections</CardTitle>
                <CardDescription>Your followers and people you follow</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFollowers ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <h3 className="font-medium mb-4">Followers ({followers.length})</h3>
                      {followers.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No followers yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {followers.map(follower => (
                            <div key={follower.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-4">Following ({following.length})</h3>
                      {following.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">You&apos;re not following anyone yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {following.map(followed => (
                            <div key={followed.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}