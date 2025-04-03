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
      <Card className="overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
        {/* User info - Moved above the image */}
        {username && (
          <div className="flex items-center justify-between p-3 border-b">
            <Link 
              href={`/users/${username}`} 
              className="flex items-center gap-2 group/user"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar className="h-7 w-7 border border-gray-200">
                <AvatarImage src={userAvatar || ""} alt={username} />
                <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium group-hover/user:text-blue-600 transition-colors">
                {username}
              </span>
            </Link>
            
            {!isOwnPhoto && user && userId && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFollow();
                }}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus className="h-3 w-3 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        
        <div 
          className="relative aspect-square overflow-hidden cursor-pointer group"
          onClick={() => router.push(`/photos/${id}`)}
        >
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {showDeleteButton && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 opacity-80 hover:opacity-100 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this photo? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <CardContent className="p-4">
          {/* Title and Rating */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg truncate leading-tight" title={title}>{title}</h3>
            <div className="flex items-center bg-amber-50 px-2 py-1 rounded-full">
              <span className="font-medium text-amber-700">{currentRating.toFixed(1)}</span>
              <span className="text-amber-500 ml-1 text-xs">({votesCount || 0})</span>
            </div>
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-normal">{description}</p>
          )}
          
          {/* Rating Stars */}
          <div className="mt-2 mb-3">
            <PhotoRating 
              photoId={id} 
              initialRating={0} 
              onRatingChange={handleRatingChange} 
            />
          </div>
          
          {/* Divider */}
          <div className="h-px w-full bg-gray-100 my-3"></div>
          
          {/* Actions */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!user || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`px-2 ${isLiked ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Heart className={`h-4 w-4 mr-1.5 ${isLiked ? "fill-current" : ""}`} />
                {currentLikes > 0 && <span className="text-sm">{currentLikes}</span>}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="px-2 text-gray-600 hover:text-gray-900"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentsOpen(true);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                <span className="text-sm">{commentsCount}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="px-2 text-gray-600 hover:text-gray-900"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`${window.location.origin}/photos/${id}`);
                  toast({
                    title: "Link copied",
                    description: "Photo link copied to clipboard"
                  });
                }}
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Date */}
            {createdAt && (
              <span className="text-xs text-gray-400">
                {new Date(createdAt).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <CommentSection photoId={id} />
        </DialogContent>
      </Dialog>
    </>
  )
} 