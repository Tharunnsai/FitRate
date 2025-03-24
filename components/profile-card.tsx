import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getProfile, followUser, unfollowUser, isFollowing as checkFollowStatus, Profile } from "@/lib/profile-service"
import { UserPlus, UserMinus, Loader2 } from "lucide-react"
import { useEffect } from "react"

interface ProfileCardProps {
  id: string
  username: string
  fullName?: string
  avatarUrl?: string
  bio?: string
  followersCount: number
  followingCount: number
  showFollowButton?: boolean
  initialIsFollowing?: boolean
  onFollowChange?: (following: boolean) => void
}

export function ProfileCard({
  id,
  username,
  fullName,
  avatarUrl,
  bio,
  followersCount,
  followingCount,
  showFollowButton = true,
  initialIsFollowing = false,
  onFollowChange
}: ProfileCardProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [checkingFollowStatus, setCheckingFollowStatus] = useState(true)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  
  // Check if the current user is following this profile
  useEffect(() => {
    async function checkIfFollowing() {
      if (!user || id === user.id) {
        setCheckingFollowStatus(false)
        return
      }
      
      try {
        console.log(`Checking if user ${user.id} follows profile ${id}`)
        const following = await checkFollowStatus(user.id, id)
        console.log(`Follow status result: ${following}`)
        setIsFollowing(following)
      } catch (error) {
        console.error("Error checking follow status:", error)
      } finally {
        setCheckingFollowStatus(false)
      }
    }
    
    // Also load the latest profile info
    async function refreshProfileData() {
      if (!id) return
      
      try {
        console.log(`Refreshing profile data for ID: ${id}`)
        const latestProfile = await getProfile(id)
        
        if (latestProfile) {
          console.log(`Latest profile data:`, latestProfile)
          setProfileData(latestProfile)
        } else {
          console.error(`Failed to retrieve profile data for ID: ${id}`)
        }
      } catch (error) {
        console.error("Error refreshing profile:", error)
      }
    }
    
    checkIfFollowing()
    refreshProfileData()
  }, [user, id])
  
  // Use the latest profile data if available
  console.log("profileCardData : ",profileData);
  const displayUsername = profileData?.username || username
  const displayFullName = profileData?.full_name || fullName
  const displayBio = profileData?.bio || bio
  const displayAvatarUrl = profileData?.avatar_url || avatarUrl
  const displayFollowersCount = profileData?.followers_count ?? followersCount
  const displayFollowingCount = profileData?.following_count ?? followingCount
  
  const handleToggleFollow = async () => {
    if (!user) return
    
    setLoading(true)
    
    try {
      if (isFollowing) {
        await unfollowUser(user.id, id)
        setIsFollowing(false)
      } else {
        await followUser(user.id, id)
        setIsFollowing(true)
      }
      
      if (onFollowChange) {
        onFollowChange(!isFollowing)
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const isOwnProfile = user && id === user.id
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link href={`/users/${displayUsername}`}>
            <Avatar className="h-16 w-16">
              <AvatarImage src={displayAvatarUrl || ""} />
              <AvatarFallback>{displayUsername?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link href={`/users/${displayUsername}`} className="hover:underline">
              <h3 className="font-semibold truncate">{displayUsername}</h3>
            </Link>
            
            {displayFullName && (
              <p className="text-sm text-gray-500 mb-1">{displayFullName}</p>
            )}
            
            {displayBio && (
              <p className="text-sm line-clamp-2 mb-2">{displayBio}</p>
            )}
            
            <div className="flex gap-4 text-sm">
              <span>
                <span className="font-medium">{displayFollowersCount}</span>
                <span className="text-gray-500 ml-1">followers</span>
              </span>
              <span>
                <span className="font-medium">{displayFollowingCount}</span>
                <span className="text-gray-500 ml-1">following</span>
              </span>
            </div>
          </div>
          
          {showFollowButton && !isOwnProfile && user && !checkingFollowStatus && (
            <Button 
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleToggleFollow}
              disabled={loading}
              className="whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : isFollowing ? (
                <UserMinus className="h-4 w-4 mr-1" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1" />
              )}
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 