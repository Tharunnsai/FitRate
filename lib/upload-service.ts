import { supabase } from './supabase'

export async function uploadPhoto(file: File, userId: string): Promise<{ success: boolean, url?: string, error?: any }> {
  try {
    // Create a FormData object to send the file
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    
    // Send the file to our API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload file')
    }
    
    const { success, url } = await response.json()
    
    if (!success || !url) {
      throw new Error('Failed to get upload URL')
    }
    
    // Now save the photo metadata to your database
    const { error } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        title: file.name.split('.')[0],
        description: '',
        image_url: url,
        created_at: new Date().toISOString(),
      })
    
    if (error) throw error
    
    return { success: true, url }
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { success: false, error }
  }
} 