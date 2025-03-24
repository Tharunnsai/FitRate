"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadPhoto } from "@/lib/photo-service"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, Upload } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError("You must be logged in to upload photos")
      return
    }
    
    if (!file) {
      setError("Please select an image to upload")
      return
    }
    
    if (!title.trim()) {
      setError("Please provide a title for your photo")
      return
    }
    
    try {
      setUploading(true)
      setError(null)
      
      const result = await uploadPhoto(user.id, file, {
        title: title.trim(),
        description: description.trim() || undefined
      })
      
      if (result.success && result.photoId) {
        router.push('/profile')
      } else {
        throw result.error || new Error("Failed to upload photo")
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }
  
  if (!user) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to be signed in to upload photos.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/signin')}>
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Upload Photo</CardTitle>
          <CardDescription>
            Share your progress with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="E.g., 3 Months Progress"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Share details about your fitness journey" 
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input 
                id="photo" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                required
              />
              
              {preview && (
                <div className="mt-4 relative aspect-[3/4] w-full max-w-md mx-auto border rounded-md overflow-hidden">
                  <Image 
                    src={preview} 
                    alt="Preview" 
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

