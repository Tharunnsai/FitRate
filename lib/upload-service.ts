import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export type UploadPhotoParams = {
  userId: string
  file: File
  title: string
  description?: string
  tags?: string[]
}

export async function uploadPhoto({
  userId,
  file,
  title,
  description,
  tags = []
}: UploadPhotoParams): Promise<{ success: boolean, photoId?: string, error?: Error }> {
  try {
    if (!userId || !file || !title) {
      throw new Error('Missing required parameters')
    }

    // Generate a unique filename with timestamp to avoid collisions
    const fileExt = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const fileName = `${userId.split('-')[0]}_${timestamp}.${fileExt}`
    
    console.log(`Uploading photo for user ${userId}, filename: ${fileName}, type: ${file.type}`)
    
    // Create a FormData object to upload the file
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    
    // Use the API route for upload instead of direct Supabase upload
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload image')
    }
    
    const { url } = await response.json()
    
    if (!url) {
      throw new Error('Failed to get public URL')
    }
    
    // Generate a unique ID for the photo record
    const photoId = crypto.randomUUID()
    
    // Current timestamp for created_at and updated_at
    const now = new Date().toISOString()
    
    // Insert the photo record
    const { error: insertError } = await supabase
      .from('photos')
      .insert({
        id: photoId,
        user_id: userId,
        title,
        description: description || null,
        image_url: url,
        rating: 0.0,
        votes_count: 0,
        likes_count: 0,
        comments_count: 0,
        created_at: now,
        updated_at: now
      })
    
    if (insertError) {
      console.error('Error inserting photo record:', insertError)
      throw insertError
    }
    
    console.log(`Photo uploaded successfully with ID: ${photoId}`)
    return { success: true, photoId }
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}
