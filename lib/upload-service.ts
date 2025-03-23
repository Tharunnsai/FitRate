import { supabase } from './supabase'

export async function uploadFile(
  userId: string, 
  file: File, 
  bucket: string
): Promise<{ success: boolean, url?: string, error?: Error }> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      throw uploadError
    }
    
    // Get the public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)
    
    return { success: true, url: data.publicUrl }
  } catch (error) {
    console.error(`Error uploading file to ${bucket}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown upload error') 
    }
  }
} 