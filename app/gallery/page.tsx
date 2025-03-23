"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Star } from "lucide-react"
import { getAllPhotos, type Photo } from "@/lib/photo-service"

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const loaderRef = useRef<HTMLDivElement>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'top-rated' | 'most-liked'>('recent')
  
  // Function to load photos
  const loadPhotos = useCallback(async (pageNum: number, reset: boolean = false) => {
    setLoading(true)
    
    try {
      const { photos: newPhotos, hasMore: moreAvailable } = await getAllPhotos(sortBy, pageNum)
      
      if (reset) {
        setPhotos(newPhotos)
      } else {
        setPhotos(prev => [...prev, ...newPhotos])
      }
      
      setHasMore(moreAvailable)
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }, [sortBy])
  
  // Initial load
  useEffect(() => {
    loadPhotos(1, true)
  }, [loadPhotos])
  
  // Load more photos when scrolling
  const loadMorePhotos = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
      loadPhotos(page + 1)
    }
  }, [loading, hasMore, page, loadPhotos])
  
  // Intersection observer for infinite scrolling
  useEffect(() => {
    const currentLoaderRef = loaderRef.current
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePhotos()
        }
      },
      { threshold: 1.0 }
    )
    
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef)
    }
    
    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef)
      }
    }
  }, [loadMorePhotos])

  // Handle sort change
  const handleSortChange = (value: 'recent' | 'top-rated' | 'most-liked') => {
    setSortBy(value);
    setPage(1);
    loadPhotos(1, true);
  };
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Fitness Gallery</h1>
        
        <Tabs defaultValue="recent" className="w-full md:w-auto" onValueChange={(value) => 
          handleSortChange(value as 'recent' | 'top-rated' | 'most-liked')
        }>
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="top-rated">Top Rated</TabsTrigger>
            <TabsTrigger value="most-liked">Most Liked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {photos.length === 0 && !loading ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">No photos yet</h2>
          <p className="text-gray-500 mb-6">Be the first to share your fitness journey!</p>
          <Button asChild>
            <Link href="/upload">Upload a Photo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={photo.image_url}
                  alt={photo.title}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold line-clamp-1">{photo.title}</h3>
                  <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded text-sm">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {photo.rating?.toFixed(1) || "New"}
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full overflow-hidden mr-2 bg-gray-200">
                    <Image
                      src={photo.user?.avatar || "/placeholder-user.jpg"}
                      alt={photo.user?.name || "User"}
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{photo.user?.name}</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(photo.created_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-gray-500">
                  {photo.votes_count || 0} votes
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      {hasMore && !loading && (
        <div ref={loaderRef} className="h-20 flex items-center justify-center">
          <Button variant="outline" onClick={loadMorePhotos}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

