"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { uploadPhoto } from "@/lib/upload-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, Image as ImageIcon, X, Check, Crop as CropIcon } from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [originalImage, setOriginalImage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    setFile(selectedFile)

    // Create a preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
      const result = reader.result as string
      setPreviewUrl(result)
      setOriginalImage(result)
      }
      reader.readAsDataURL(selectedFile)
  }
  
  const handleCropStart = () => {
    setIsCropping(true)
  }
  
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
    
    // Apply zoom to the preview image
    if (imageRef.current && originalImage && canvasRef.current) {
      const img = imageRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate dimensions while maintaining aspect ratio
        const aspectRatio = img.naturalWidth / img.naturalHeight
        
        // Calculate the size based on zoom
        let drawWidth, drawHeight
        
        if (aspectRatio > 1) {
          // Landscape
          drawHeight = canvas.height / zoom
          drawWidth = drawHeight * aspectRatio
    } else {
          // Portrait
          drawWidth = canvas.width / zoom
          drawHeight = drawWidth / aspectRatio
        }
        
        // Center the image
        const offsetX = (canvas.width - drawWidth) / 2
        const offsetY = (canvas.height - drawHeight) / 2
        
        // Draw the image with zoom
        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        )
      }
    }
  }
  
  const handleCropCancel = () => {
    setIsCropping(false)
    setZoom(1)
  }
  
  const handleCropConfirm = async () => {
    if (!canvasRef.current || !file) return
    
    try {
      // Convert canvas to blob
      const canvas = canvasRef.current
      
      canvas.toBlob((blob) => {
        if (!blob || !file) {
          return
        }
        
        // Create a new file from the blob
        const croppedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        
        setFile(croppedFile)
        
        // Update preview with cropped image
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
          setIsCropping(false)
        }
        reader.readAsDataURL(croppedFile)
      }, 'image/jpeg', 0.95)
    } catch (err) {
      console.error('Error cropping image:', err)
      setError('Failed to crop image')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !file || !title.trim()) {
      setError('Please provide a title and image')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { success, photoId, error: uploadError } = await uploadPhoto({
        userId: user.id,
        file,
        title: title.trim(),
        description: description.trim() || undefined
      })
      
      if (!success || !photoId) {
        throw uploadError || new Error('Failed to upload photo')
      }
      
      // Redirect to the photo detail page or profile
      router.push(`/photos/${photoId}`)
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during upload')
    } finally {
      setLoading(false)
    }
  }
  
  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You must be logged in to upload photos.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Photo</h1>

      <Card>
        <CardHeader>
          <CardTitle>Share your fitness journey</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isCropping && previewUrl ? (
              <div className="space-y-4">
                <h3 className="font-medium">Adjust your image</h3>
                <div className="max-w-full overflow-auto">
                  <div className="flex flex-col items-center">
                    <canvas 
                      ref={canvasRef}
                      width={300}
                      height={300}
                      className="border rounded-md mb-4"
                    />
                    
                    <img 
                      ref={imageRef}
                      src={previewUrl} 
                      alt="Preview" 
                      className="hidden"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        if (canvasRef.current) {
                          const canvas = canvasRef.current
                          const ctx = canvas.getContext('2d')
                          if (ctx) {
                            // Draw the initial image centered in the canvas
                            // while maintaining aspect ratio
                            const aspectRatio = img.naturalWidth / img.naturalHeight
                            let drawWidth, drawHeight, offsetX, offsetY
                            
                            if (aspectRatio > 1) {
                              // Landscape
                              drawHeight = canvas.height
                              drawWidth = drawHeight * aspectRatio
                              offsetX = (canvas.width - drawWidth) / 2
                              offsetY = 0
                            } else {
                              // Portrait
                              drawWidth = canvas.width
                              drawHeight = drawWidth / aspectRatio
                              offsetX = 0
                              offsetY = (canvas.height - drawHeight) / 2
                            }
                            
                            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
                          }
                        }
                      }}
                    />
                    
                    <div className="w-full max-w-xs mt-4">
                      <Label htmlFor="zoom" className="mb-2 block">Zoom</Label>
                      <Slider
                        id="zoom"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[zoom]}
                        onValueChange={handleZoomChange}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCropCancel}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleCropConfirm}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Apply Changes
                  </Button>
                </div>
              </div>
            ) : (
              <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your photo a title"
                required
              />
            </div>

            <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more details about your photo"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
                  {previewUrl ? (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-[300px] object-contain border rounded-md"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white/80"
                          onClick={handleCropStart}
                        >
                          <CropIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white/80"
                          onClick={() => {
                            setFile(null)
                            setPreviewUrl(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-md p-8 text-center">
                      <Input 
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                        className="hidden"
                      />
                      <Label 
                        htmlFor="photo" 
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium">Click to select an image</span>
                        <span className="text-xs text-gray-500">JPG, PNG, GIF up to 10MB</span>
                      </Label>
                  </div>
                )}
              </div>
              </>
            )}
          </CardContent>
          
          {!isCropping && (
            <CardFooter className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !file || !title.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                  </>
              ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                  </>
              )}
            </Button>
            </CardFooter>
          )}
          </form>
      </Card>
    </div>
  )
}
