"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import { getAllPhotos, type Photo } from "@/lib/photo-service"
import { PhotoCard } from "@/components/photo-card"

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'latest' | 'top_rated' | 'popular'>('latest')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // Load photos on mount and when sort changes
  useEffect(() => {
    async function loadPhotos() {
      setLoading(true)
      
      try {
        const fetchedPhotos = await getAllPhotos({
          page: 1,
          limit: 12,
          orderBy: sortBy
        })
        
        setPhotos(fetchedPhotos || [])
        setHasMore(fetchedPhotos.length === 12)
        setPage(1)
      } catch (error) {
        console.error('Error loading photos:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadPhotos()
  }, [sortBy])
  
  // Load more photos when page changes
  const loadMorePhotos = async () => {
    if (!hasMore || loading) return
    
    const nextPage = page + 1
    setLoading(true)
    
    try {
      const morePhotos = await getAllPhotos({
        page: nextPage,
        limit: 12,
        orderBy: sortBy
      })
      
      if (morePhotos.length > 0) {
        setPhotos(prevPhotos => [...prevPhotos, ...morePhotos])
        setHasMore(morePhotos.length === 12)
        setPage(nextPage)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more photos:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gallery</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Browse fitness progress photos shared by the community
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as 'latest' | 'top_rated' | 'popular')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="top_rated">Top Rated</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {loading && photos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="relative aspect-[3/4] bg-gray-200 animate-pulse" />
              <CardContent className="p-4">
                <div className="h-5 w-3/4 bg-gray-200 animate-pulse mb-2 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : photos.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                username={photo.user?.username}
                userAvatar={photo.user?.avatar_url}
                userId={photo.user_id}
                createdAt={photo.created_at}
              />
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-10">
              <Button 
                variant="outline" 
                size="lg"
                onClick={loadMorePhotos} 
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <h3 className="text-xl font-medium mb-2">No photos found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Be the first to share your fitness journey.
          </p>
        </div>
      )}
    </div>
  )
}
