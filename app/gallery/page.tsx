"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MessageSquare, Heart, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { supabase } from '@/lib/supabase'
import { getAllPhotos, type Photo, getPhotoById } from "@/lib/photo-service"
import { useAuth } from "@/lib/auth-context"
import { ratePhoto, getUserRatings } from "@/lib/rating-service"
import { useRouter } from "next/navigation"

// Mock data generator for the gallery
const generateMockPhotos = (startId = 1, count = 6) => {
  return Array.from({ length: count }, (_, i) => {
    const id = startId + i
    const rating = (Math.random() * 3 + 7).toFixed(1) // Random rating between 7.0 and 10.0
    return {
      id,
      title: [
        "3 Months Progress",
        "One Year Transformation",
        "First Competition Prep",
        "Back Day Progress",
        "6 Month Transformation",
        "Leg Day Results",
        "Morning Workout",
        "Fitness Journey Update",
        "Cutting Phase Results",
        "Bulking Season",
      ][Math.floor(Math.random() * 10)],
      imageUrl: `/placeholder.svg?height=${400 + id * 10}&width=300`,
      user: {
        name: ["Alex Johnson", "Sam Wilson", "Jamie Smith", "Taylor Reed", "Jordan Lee", "Casey Morgan"][
          Math.floor(Math.random() * 6)
        ],
        avatar: "/placeholder-user.jpg",
      },
      rating: Number.parseFloat(rating),
      votes: Math.floor(Math.random() * 100) + 10,
      comments: Math.floor(Math.random() * 20) + 1,
      likes: Math.floor(Math.random() * 150) + 20,
      description: [
        "After months of consistent training and diet. Still a long way to go!",
        "Can't believe how far I've come. So proud of my progress!",
        "Weeks out from my first competition. Any advice is welcome!",
        "Been focusing on my back development for the past few months.",
        "From couch potato to fitness enthusiast!",
        "Never skip leg day! Seeing some real progress after focusing on form.",
        "Morning workouts have changed my life. More energy throughout the day!",
        "Slow and steady progress. Consistency is key!",
        "The cutting phase is almost over. Can't wait to start building again.",
        "Bulking season is in full swing. Trying to add quality mass.",
      ][Math.floor(Math.random() * 10)],
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    }
  })
}

// This function would fetch images from Supabase
async function getImages() {
  // In a real implementation, you would fetch image metadata from your database
  // and then get the URLs from Supabase storage
  
  // For demo purposes, let's assume we're directly listing from the storage bucket
  const { data, error } = await supabase
    .storage
    .from('images')
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    
  if (error) {
    console.error('Error fetching images:', error);
    return [];
  }
  
  // Transform the data to include public URLs
  return data.map(item => {
    const { data: urlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(item.name);
      
    return {
      id: item.id,
      title: item.name.split('_')[0], // This is just a placeholder
      imageUrl: urlData.publicUrl,
      rating: Math.floor(Math.random() * 10) + 1, // Placeholder
      likes: Math.floor(Math.random() * 100), // Placeholder
      uploadDate: new Date(item.created_at).toISOString(),
    };
  });
}

// Update the supabaseLoader function with proper TypeScript types
const supabaseLoader = ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
  // Only add query params for Supabase URLs
  if (src.includes('tysdqyzxglrdmbgofqaq.supabase.co')) {
    return `${src}?w=${width}&q=${quality || 75}`
  }
  return src
}

// Separate the gallery content into its own component
function GalleryContent() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'recent' | 'top-rated' | 'most-liked'>('recent')
  const [loading, setLoading] = useState(false)
  const [userRatings, setUserRatings] = useState<Record<string, number>>({})
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({})
  const loaderRef = useRef(null)
  const { user } = useAuth()
  const router = useRouter()

  // Load photos when component mounts or sort changes
  useEffect(() => {
    async function loadPhotos() {
      setLoading(true)
      setPage(1)
      
      const { photos, hasMore } = await getAllPhotos(sortBy, 1)
      
      setPhotos(photos)
      setHasMore(hasMore)
      setLoading(false)
    }
    
    loadPhotos()
  }, [sortBy])

  // Load more photos when scrolling
  const loadMorePhotos = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const nextPage = page + 1
    
    const { photos: newPhotos, hasMore: moreAvailable } = await getAllPhotos(sortBy, nextPage)
    
    setPhotos(prev => [...prev, ...newPhotos])
    setHasMore(moreAvailable)
    setPage(nextPage)
    setLoading(false)
  }

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMorePhotos()
        }
      },
      { threshold: 1.0 },
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
    }
  }, [loading, photos.length])

  // Load user ratings when component mounts
  useEffect(() => {
    async function loadUserRatings() {
      if (!user) return
      
      const ratings = await getUserRatings(user.id)
      setUserRatings(ratings)
    }
    
    if (user) {
      loadUserRatings()
    }
  }, [user])

  const handleRate = async (id: string, rating: number) => {
    if (!user) {
      // Redirect to login
      router.push('/login')
      return
    }
    
    // Update UI immediately for better UX
    setUserRatings(prev => ({
      ...prev,
      [id]: rating
    }))
    
    // Send rating to server
    const { success, error } = await ratePhoto(user.id, id, rating)
    
    if (!success) {
      console.error('Error rating photo:', error)
      // Revert UI change if there was an error
      setUserRatings(prev => {
        const newRatings = { ...prev }
        delete newRatings[id]
        return newRatings
      })
    } else {
      // Only update the specific photo that was rated, not the entire list
      const updatedPhoto = await getPhotoById(id)
      if (updatedPhoto) {
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === id ? { ...photo, rating: updatedPhoto.rating, votes_count: updatedPhoto.votes_count } : photo
          )
        )
      }
    }
  }

  const handleLike = (id: string) => {
    // Toggle like status
    const newLikedStatus = !likedPosts[id]

    setLikedPosts((prev) => ({
      ...prev,
      [id]: newLikedStatus,
    }))

    // Update like count
    setPhotos(
      photos.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              likes_count: photo.likes_count + (newLikedStatus ? 1 : -1),
            }
          : photo,
      ),
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`
    } else {
      return `${Math.floor(diffInSeconds / 86400)} days ago`
    }
  }

  return (
    <div className="container max-w-xl py-6">
      <h1 className="sr-only">Fitness Gallery</h1>

      <div className="flex flex-col space-y-6">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden border-none shadow-lg">
            {/* Header with user info */}
            <div className="flex items-center p-4">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={photo.user?.avatar || "/placeholder-user.jpg"} alt={photo.user?.name || "User"} />
                <AvatarFallback>{photo.user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{photo.user?.name || "User"}</p>
                <p className="text-xs text-gray-500">{formatDate(photo.created_at)}</p>
              </div>
            </div>

            {/* Image */}
            <div className="relative aspect-square overflow-hidden">
              <Image 
                src={photo.image_url}
                alt={photo.title || "Photo"} 
                fill 
                className="object-cover"
                unoptimized={true}
              />
            </div>

            {/* Action buttons */}
            <div className="p-4 pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => handleLike(photo.id)}
                  >
                    <Heart className={`h-6 w-6 ${likedPosts[photo.id] ? "fill-red-500 text-red-500" : ""}`} />
                    <span className="sr-only">Like</span>
                  </Button>

                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MessageSquare className="h-6 w-6" />
                    <span className="sr-only">Comment</span>
                  </Button>
                </div>

                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 mr-1" />
                  <span className="font-medium">{photo.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500 ml-1">({photo.votes_count})</span>
                </div>
              </div>

              {/* Likes count */}
              <p className="text-sm font-medium mb-1">{photo.likes_count} likes</p>

              {/* Caption */}
              <div className="mb-3">
                <p className="text-sm">
                  <span className="font-medium">{photo.user?.name || "User"}</span>{" "}
                  <span className="text-gray-700 dark:text-gray-300">{photo.description}</span>
                </p>
              </div>

              {/* Rating section */}
              <div className="mt-4 border-t pt-3">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Rate this photo:</p>
                    <p className="text-sm font-bold">
                      {userRatings[photo.id] ? `Your rating: ${userRatings[photo.id]}/10` : "Not rated"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs">1</span>
                    <div className="flex-1 mx-2">
                      <Progress value={userRatings[photo.id] ? userRatings[photo.id] * 10 : 0} className="h-2" />
                    </div>
                    <span className="text-xs">10</span>
                  </div>

                  <div className="grid grid-cols-10 gap-1 mt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                      <Button
                        key={rating}
                        variant={userRatings[photo.id] === rating ? "default" : "outline"}
                        size="sm"
                        className="h-8 p-0"
                        onClick={() => handleRate(photo.id, rating)}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={loaderRef} className="h-10 flex items-center justify-center">
          {hasMore && !loading ? (
            <p className="text-sm text-gray-500">Scroll for more</p>
          ) : !hasMore ? (
            <p className="text-sm text-gray-500">No more photos to load</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Main gallery page with Suspense boundary
export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-xl py-6">
        <div className="flex flex-col space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden border-none shadow-lg">
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-[300px] w-full" />
              <div className="p-4 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-10 w-[100px]" />
                  <Skeleton className="h-10 w-[100px]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    }>
      <GalleryContent />
    </Suspense>
  )
}

