"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { 
  getProfile,
  getProfileByUsername, 
  followUser, 
  unfollowUser, 
  isFollowing,
  getFollowers,
  getFollowing,
  type Profile 
} from "@/lib/profile-service"
import { getUserPhotosByUsername, type Photo } from "@/lib/photo-service"
import { PhotoCard } from "@/components/photo-card"
import { Users, UserPlus, UserMinus, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const username = params.username as string
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [followers, setFollowers] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Profile[]>([])
  
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [isUserFollowing, setIsUserFollowing] = useState(false)
  
  // Load profile and check follow status
  useEffect(() => {
    async function loadProfile() {
      if (!username) return;
      
      setLoading(true);
      console.log(`[UserProfilePage] Loading profile for username: "${username}"`);
      
      try {
        // Load the profile by username
        const profileData = await getProfileByUsername(username);
        console.log('Profile data:', profileData);
        
        // Check if profileData exists and is properly structured
        if (!profileData || !profileData.id) {
          console.log(`[UserProfilePage] No valid profile found for username: ${username}`);
          setLoading(false);
          return;
        }
        
        console.log(`[UserProfilePage] Profile lookup result: Found user ${profileData.username} (${profileData.id})`);
        setProfile(profileData);
        
        // Now that we have a valid profile ID, load photos and followers
        const [userPhotos, userFollowers, userFollowing] = await Promise.all([
          getUserPhotosByUsername(username),
          getFollowers(profileData.id),
          getFollowing(profileData.id)
        ]);
        
        setPhotos(userPhotos);
        setFollowers(userFollowers);
        setFollowing(userFollowing);
        
        // Check if current user is following this profile
        if (user && user.id !== profileData.id) {
          const following = await isFollowing(user.id, profileData.id);
          setIsUserFollowing(following);
        }
      } catch (error) {
        console.error(`[UserProfilePage] Error loading profile for ${username}:`, error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [username, user]);
  
  // Handle follow/unfollow
  const handleToggleFollow = async () => {
    if (!user || !profile) return
    
    setFollowLoading(true)
    
    try {
      if (isUserFollowing) {
        // Unfollow
        await unfollowUser(user.id, profile.id)
        setIsUserFollowing(false)
        // Update followers count
        setFollowers(prev => prev.filter(f => f.id !== user.id))
      } else {
        // Follow
        await followUser(user.id, profile.id)
        setIsUserFollowing(true)
        // Add current user to followers (this is simplified)
        const currentUserProfile = await getProfile(user.id);
        if (currentUserProfile) {
          setFollowers(prev => [...prev, currentUserProfile])
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    } finally {
      setFollowLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!profile) {
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <p>The user you're looking for doesn't exist.</p>
      </div>
    )
  }
  
  const isOwnProfile = user && profile.id === user.id
  
  return (
    <div className="container max-w-4xl py-8">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>{profile.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              {profile.full_name && (
                <p className="text-gray-500">{profile.full_name}</p>
              )}
              {profile.bio && (
                <p className="mt-2">{profile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                <div>
                  <span className="font-semibold">{photos.length}</span>
                  <span className="text-gray-500 ml-1">Posts</span>
                </div>
                <div>
                  <span className="font-semibold">{followers.length}</span>
                  <span className="text-gray-500 ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-semibold">{following.length}</span>
                  <span className="text-gray-500 ml-1">Following</span>
                </div>
              </div>
            </div>
            
            {!isOwnProfile && user && (
              <div className="mt-4 md:mt-0 w-full md:w-auto">
                <Button 
                  onClick={handleToggleFollow} 
                  disabled={followLoading}
                  variant={isUserFollowing ? "outline" : "default"}
                  size="sm"
                  className="w-full md:w-auto"
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isUserFollowing ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isUserFollowing ? "Unfollow" : "Follow"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="photos">
        <TabsList className="mb-6">
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>
        
        <TabsContent value="photos">
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 mb-2">No photos yet</p>
              {isOwnProfile && (
                <Button asChild>
                  <a href="/upload">Upload Your First Photo</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  id={photo.id}
                  imageUrl={photo.image_url}
                  title={photo.title}
                  description={photo.description}
                  rating={photo.rating}
                  votesCount={photo.votes_count}
                  likesCount={photo.likes_count}
                  commentsCount={photo.comments_count}
                  username={profile.username}
                  userAvatar={profile.avatar_url}
                  createdAt={photo.created_at}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="followers">
          <Card>
            <CardHeader>
              <CardTitle>Followers ({followers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {followers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No followers yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {followers.map(follower => (
                    <a 
                      key={follower.id} 
                      href={`/users/${follower.username}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <Avatar>
                        <AvatarImage src={follower.avatar_url || ""} />
                        <AvatarFallback>{follower.username?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{follower.username}</p>
                        {follower.full_name && (
                          <p className="text-xs text-gray-500 truncate">{follower.full_name}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="following">
          <Card>
            <CardHeader>
              <CardTitle>Following ({following.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {following.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Not following anyone yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {following.map(followed => (
                    <a 
                      key={followed.id} 
                      href={`/users/${followed.username}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <Avatar>
                        <AvatarImage src={followed.avatar_url || ""} />
                        <AvatarFallback>{followed.username?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{followed.username}</p>
                        {followed.full_name && (
                          <p className="text-xs text-gray-500 truncate">{followed.full_name}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 