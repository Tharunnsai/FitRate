"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ratePhoto, getUserRating } from "@/lib/rating-service"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface PhotoRatingProps {
  photoId: string
  initialRating: number
  onRatingChange: (oldRating: number, newRating: number) => void
}
export function getInitialRating(): number {
  return 0;
}

export function PhotoRating({ photoId, initialRating, onRatingChange }: PhotoRatingProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rating, setRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isRating, setIsRating] = useState(false)
  const [hasRated, setHasRated] = useState(false)
  
  // Load user's existing rating for this photo
  useEffect(() => {
    async function loadUserRating() {
      if (!user) return
      
      const userRating = await getUserRating(user.id, photoId)
      if (userRating) {
        setRating(userRating)
        setHasRated(true)
      } else if (initialRating) {
        setRating(initialRating)
      }
    }
    
    loadUserRating()
  }, [user, photoId, initialRating])
  
  const handleRating = async (value: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to rate photos"
      })
      return
    }
    
    setIsRating(true)
    const { success, error } = await ratePhoto(user.id, photoId, value)
    setIsRating(false)
    
    if (success) {
      setRating(value)
      setHasRated(true)
      if (onRatingChange) {
        onRatingChange(rating || 0, value)
      }
      toast({
        title: "Rating submitted",
        description: "Thank you for rating this photo!"
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to rate photo. Please try again."
      })
    }
  }
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            className={`px-1 ${
              (hoveredRating !== null ? value <= hoveredRating : value <= (rating || 0))
                ? "text-yellow-500"
                : "text-gray-300"
            }`}
            disabled={isRating}
            onMouseEnter={() => setHoveredRating(value)}
            onMouseLeave={() => setHoveredRating(null)}
            onClick={() => handleRating(value)}
          >
            <Star className="h-5 w-5 fill-current" />
          </Button>
        ))}
      </div>
      <div className="text-sm text-center">
        {hasRated ? (
          <span>Your rating: <strong>{rating}/10</strong></span>
        ) : (
          <span>Rate this photo</span>
        )}
      </div>
    </div>
  )
} 