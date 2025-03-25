"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitialRating, PhotoRating } from "@/components/photo-rating"
import { Button } from "@/components/ui/button"
import { Trash, Heart, MessageCircle, Share, UserPlus, UserMinus, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { likePhoto, unlikePhoto, hasLikedPhoto, deletePhoto } from "@/lib/photo-service"
import { followUser, unfollowUser, isFollowing as checkFollowStatus } from "@/lib/profile-service"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { CommentSection } from "@/components/comment-section"
import Link from "next/link"
import { getUserRating } from "@/lib/rating-service"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface PhotoCardProps {
  id: string
  imageUrl: string
  title: string
  description?: string
  rating?: number
  votesCount?: number
  likesCount?: number
  commentsCount?: number
  username?: string
  userAvatar?: string
  userId?: string
  createdAt?: string
  showDeleteButton?: boolean
  onDelete?: () => void
}

export function PhotoCard({
  id,
  imageUrl,
  title,
  description,
  rating,
  votesCount = 0,
  likesCount = 0,
  commentsCount = 0,
  username,
  userAvatar,
  userId,
  createdAt,
  showDeleteButton,
  onDelete
}: PhotoCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [currentRating, setCurrentRating] = useState(rating || 0)
  const [currentLikes, setCurrentLikes] = useState(likesCount)
  const [isLiked, setIsLiked] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    async function checkLikeStatus() {
      if (!user) return
      const liked = await hasLikedPhoto(user.id, id)
      setIsLiked(liked)
    }
    
    checkLikeStatus()
  }, [user, id])
  
  useEffect(() => {
    async function checkIsFollowing() {
      if (user && userId) {
        try {
          const following = await checkFollowStatus(user.id, userId);
          setIsFollowing(following);
        } catch (error) {
          console.error('Error checking follow status:', error);
        }
      }
    }
    
    checkIsFollowing()
  }, [user, userId])
  
  const handleRatingChange = (oldRating:number, newRating: number) => {
    setCurrentRating((currentRating*(votesCount)+ newRating - oldRating)/votesCount)
  }
  
  const handleLike = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      if (isLiked) {
        await unlikePhoto(user.id, id)
        setCurrentLikes(prev => Math.max(0, prev - 1))
        setIsLiked(false)
      } else {
        await likePhoto(user.id, id)
        setCurrentLikes(prev => prev + 1)
        setIsLiked(true)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleToggleFollow = async () => {
    if (!user || !userId || user.id === userId) return
    
    setFollowLoading(true)
    
    try {
      if (isFollowing) {
        await unfollowUser(user.id, userId)
        setIsFollowing(false)
      } else {
        await followUser(user.id, userId)
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }
  
  const isOwnPhoto = user && userId === user.id
  
  const handleCardClick = () => {
    router.push(`/photos/${id}`)
  }
  
  const handleDelete = async () => {
    if (!user) return
    
    setIsDeleting(true)
    
    try {
      // Get the actual user ID from the photo data
      const actualUserId = Array.isArray(userId) ? userId[0] : userId;
      
      console.log(`Attempting to delete photo ${id} by user ${user.id}, photo owner: ${actualUserId}`);
      
      const { success, error } = await deletePhoto(id, user.id)
      
      if (success) {
        toast({
          title: "Photo deleted",
          description: "Your photo has been successfully deleted"
        })
        
        // Always redirect to profile after deletion
        router.push(`/profile`)
        
        // Still call onDelete if provided (for UI updates in parent components)
        if (onDelete) {
          onDelete()
        }
      } else {
        throw error || new Error("Failed to delete photo")
      }
    } catch (err) {
      console.error("Error deleting photo:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete photo"
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <>
      <Card className="overflow-hidden">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          {showDeleteButton && onDelete && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute top-2 right-2 opacity-80 hover:opacity-100"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-lg truncate">{title}</h3>
            <div className="flex items-center">
              <span className="font-medium">{currentRating.toFixed(1)}</span>
              <span className="text-gray-500 ml-1">({votesCount || 0})</span>
            </div>
          </div>
          {description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{description}</p>
          )}
          <PhotoRating 
            photoId={id} 
            initialRating={0} 
            onRatingChange={handleRatingChange} 
          />
          
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              disabled={!user || isLoading}
              onClick={handleLike}
              className={isLiked ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
              {currentLikes > 0 && <span>{currentLikes}</span>}
            </Button>
            
            <CommentSection photoId={id} />
            
            {userId && user && userId !== user.id && (
              <Button
                variant={isFollowing ? "outline" : "ghost"}
                size="sm"
                className={isFollowing ? "text-primary" : ""}
                disabled={followLoading}
                onClick={handleToggleFollow}
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : isFollowing ? (
                  <UserMinus className="h-4 w-4 mr-1" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1" />
                )}
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              className="ml-auto"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: title,
                    text: description || `Check out this fitness photo by ${username}`,
                    url: window.location.origin + `/photos/${id}`
                  }).catch(err => console.error('Error sharing:', err))
                } else {
                  navigator.clipboard.writeText(window.location.origin + `/photos/${id}`)
                  alert('Link copied to clipboard!')
                }
              }}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 border-t">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={userAvatar} />
              <AvatarFallback>{username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <Link href={`/users/${username}`} className="text-sm font-medium hover:underline">{username || "Anonymous"}</Link>
              {createdAt && (
                <p className="text-xs text-gray-500">
                  {new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comments on {title}</DialogTitle>
          </DialogHeader>
          <CommentSection photoId={id} />
        </DialogContent>
      </Dialog> */}
    </>
  )
} 