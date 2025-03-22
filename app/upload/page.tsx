"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ImageIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadPhoto } from "@/lib/photo-service"

export default function UploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [uploading, setUploading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !title || !user) return

    try {
      setUploading(true)
      
      // Use the new uploadPhoto function
      const { success, photo, error } = await uploadPhoto(
        user.id, 
        file, 
        title, 
        description
      )
      
      if (!success) {
        throw new Error(error.message || "Failed to upload photo")
      }
      
      setIsSuccess(true)
      setUploading(false)
      
      // Reset form
      setTitle('')
      setDescription('')
      setFile(null)
      setPreview(null)
      
    } catch (error) {
      console.error('Error uploading image:', error)
      setUploading(false)
      // Handle error appropriately
    }
  }

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Upload Your Fitness Photo</h1>

      <Card>
        <CardHeader>
          <CardTitle>Share your progress</CardTitle>
          <CardDescription>Upload a photo to share with the community and get feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 3 months of training"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share details about your fitness journey..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 relative">
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />

                {preview ? (
                  <div className="relative w-full max-h-[300px] overflow-hidden rounded-md">
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-auto object-contain" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6">
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Drag and drop your image here, or click to select</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={uploading || !file || !title}>
              {uploading ? (
                <span className="flex items-center">
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </span>
              )}
            </Button>
          </form>

          {isSuccess && (
            <div className="mt-4">
              <Alert>
                <AlertDescription>
                  Your photo was uploaded successfully!
                </AlertDescription>
              </Alert>
              <div className="mt-4 flex justify-center">
                <Button asChild>
                  <Link href="/gallery">View in Gallery</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

