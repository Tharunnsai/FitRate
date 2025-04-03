"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPhoto, type Photo } from "@/lib/photo-service"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PhotoRating } from "@/components/photo-rating"
import { CommentSection } from "@/components/comment-section"
import { Loader2, ArrowLeft, Heart, MessageSquare } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { PhotoCard } from "@/components/photo-card"

export default function PhotoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const photoId = params.id as string
  
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()

  const [isLiked, setIsLiked] = useState(false)

  
  useEffect(() => {
    async function loadPhoto() {
      if (!photoId) return
      
      try {
        setLoading(true)
        const photoData = await getPhoto(photoId)
        
        if (!photoData) {
          setError("Photo not found")
          return
        }
        
        console.log("Photo data structure:", JSON.stringify(photoData, null, 2))
        setPhoto(photoData)
      } catch (err) {
        console.error("Error loading photo:", err)
        setError("Failed to load photo")
      } finally {
        setLoading(false)
      }
    }
    
    loadPhoto()
  }, [photoId])
  
  if (loading) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (error || !photo) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">
              {error || "Photo not found"}
            </h2>
            <p className="text-gray-500 mb-6">
              The photo you're looking for might have been removed or doesn't exist.
            </p>
            <Button onClick={() => router.push("/gallery")}>
              Return to Gallery
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container max-w-5xl py-8">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card className="overflow-hidden">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={photo.user?.avatar_url || ""} />
              <AvatarFallback>
                {photo.user?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link 
                href={`/users/${photo.user?.username}`}
                className="font-medium hover:underline"
              >
                {photo.user?.username || "Anonymous"}
              </Link>
              {/* <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
              </p> */}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {photo && photo.image_url ? (
            <div className="relative aspect-video w-full">
              <Image
                src={photo.image_url}
                alt={photo.title || "Photo"}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">Image not available</p>
            </div>
          )}
          
          <h1 className="text-xl font-bold mb-2">{photo.title}</h1>
          {photo.description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {photo.description}
            </p>
          )}
          
          <div className="flex items-center justify-between py-4 border-t border-b">
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{photo.likes_count || 0}</span>
                </Button>
              </div>
              
              <CommentSection photoId={photo.id} />
            </CardFooter>
            
            <div className="flex items-center">
              <div className="flex items-center">
                <span className="font-medium mr-2">Rating:</span>
                <span className="text-lg font-bold">
                  {photo.rating ? photo.rating.toFixed(1) : "N/A"}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  ({photo.votes_count || 0} votes)
                </span>
              </div>
            </div>
          </div>
          
          <div className="py-4">
            <PhotoRating 
              photoId={photo.id} 
              initialRating={0}
              onRatingChange={(oldRating, newRating) => {
                // Update the UI with the new rating
                setPhoto(prev => {
                  if (!prev) return prev
                  
                  const newVotesCount = prev.votes_count + (oldRating === 0 ? 1 : 0)
                  // Calculate newRating first before using it
                  const newTotalRating = (prev.rating * prev.votes_count) - oldRating + newRating
                  const calculatedNewRating = newTotalRating / newVotesCount
                  
                  return {
                    ...prev,
                    rating: calculatedNewRating,
                    votes_count: newVotesCount
                  }
                })
              }}
            />
          </div>
        </CardContent>
        
      </Card>
    </div>
  )
} 