"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { getPhotoComments, addComment, type Comment } from "@/lib/photo-service"
import { useAuth } from "@/lib/auth-context"
import { formatDistanceToNow } from "date-fns"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CommentSectionProps {
  photoId: string
}

export function CommentSection({ photoId }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load comments
  useEffect(() => {
    async function loadComments() {
      setIsLoading(true)
      try {
        const fetchedComments = await getPhotoComments(photoId)
        setComments(fetchedComments)
      } catch (err) {
        setError("Failed to load comments")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadComments()
  }, [photoId])
  
  // Submit a new comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError("You must be logged in to comment")
      return
    }
    
    if (!newComment.trim()) {
      setError("Comment cannot be empty")
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await addComment(user.id, photoId, newComment)
      
      if (result.success) {
        // Optimistically add the comment to the list
        // In a real app, you might want to fetch the actual comment with its ID
        const optimisticComment: Comment = {
          id: result.commentId || "temp-id",
          photo_id: photoId,
          user_id: user.id,
          content: newComment,
          created_at: new Date().toISOString(),
          user: {
            username: user.email?.split('@')[0] || "User",
            avatar_url: user.user_metadata?.avatar_url
          }
        }
        
        // Add the new comment to the top of the list
        setComments(prev => [optimisticComment, ...prev])
        setNewComment("")
      } else {
        throw result.error || new Error("Failed to add comment")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Textarea
          placeholder="Add your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!user || isSubmitting}
          className="min-h-[80px]"
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={!user || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Comment"
            )}
          </Button>
        </div>
      </form>
      
      <Separator />
      
      {/* Comments list */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto pt-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Be the first to leave a comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user?.avatar_url || ""} />
                <AvatarFallback>
                  {comment.user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <p className="font-medium text-sm mb-1">
                    {comment.user?.username || "Anonymous"}
                  </p>
                  <p className="text-sm">{comment.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 