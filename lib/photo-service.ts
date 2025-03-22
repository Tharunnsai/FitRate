import { supabase } from './supabase'

export type Photo = {
  id: string
  user_id: string
  title: string
  description: string
  image_url: string
  rating: number
  votes_count: number
  likes_count: number
  created_at: string
  updated_at: string
  user?: {
    name: string
    avatar: string
  }
}

export async function uploadPhoto(
  userId: string, 
  file: File, 
  title: string, 
  description: string
): Promise<{ success: boolean, photo?: Photo, error?: any }> {
  try {
    // 1. Upload the image to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
      
    if (uploadError) {
      throw uploadError
    }
    
    // 2. Get the public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)
    
    // 3. Save the metadata to the photos table
    const photoData = {
      user_id: userId,
      title,
      description,
      image_url: urlData.publicUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('photos')
      .insert(photoData)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return { success: true, photo: data }
    
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { success: false, error }
  }
}

export async function getUserPhotos(userId: string): Promise<Photo[]> {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user photos:', error)
      return []
    }
    
    // Get the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', userId)
      .single()
    
    // Add user info to each photo
    const photosWithUserInfo = data.map(photo => ({
      ...photo,
      user: {
        name: profile ? (profile.full_name || profile.username) : 'User',
        avatar: profile?.avatar_url || '/placeholder-user.jpg'
      }
    }))
    
    return photosWithUserInfo || []
  } catch (error) {
    console.error('Error in getUserPhotos:', error)
    return []
  }
}

export async function getAllPhotos(
  sortBy: 'recent' | 'top-rated' | 'most-liked' = 'recent',
  page: number = 1,
  limit: number = 12
): Promise<{ photos: Photo[], hasMore: boolean }> {
  try {
    // First, get the total count to avoid range errors
    const { count, error: countError } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error counting photos:', countError)
      return { photos: [], hasMore: false }
    }
    
    // If there are no photos or requesting beyond available photos, return empty
    if (!count || (page - 1) * limit >= count) {
      return { photos: [], hasMore: false }
    }
    
    // Now fetch the actual photos
    let query = supabase
      .from('photos')
      .select('*')
    
    // Apply sorting
    switch (sortBy) {
      case 'top-rated':
        query = query.order('rating', { ascending: false })
        break
      case 'most-liked':
        query = query.order('likes_count', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = Math.min(from + limit - 1, count - 1) // Ensure we don't go beyond available rows
    
    const { data, error } = await query
      .range(from, to)
    
    if (error) {
      console.error('Error fetching photos:', error)
      return { photos: [], hasMore: false }
    }
    
    // Get user profiles for each photo
    const userIds = [...new Set(data.map(photo => photo.user_id))]
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)
    
    // Create a map of user profiles by ID for quick lookup
    const profileMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile
      return map
    }, {})
    
    // Add user info to each photo
    const photosWithUserInfo = data.map(photo => {
      const profile = profileMap[photo.user_id]
      return {
        ...photo,
        user: {
          name: profile ? (profile.full_name || profile.username) : 'User',
          avatar: profile?.avatar_url || '/placeholder-user.jpg'
        }
      }
    })
    
    const hasMore = count ? from + limit < count : false
    
    return { 
      photos: photosWithUserInfo || [], 
      hasMore 
    }
  } catch (error) {
    console.error('Error in getAllPhotos:', error)
    return { photos: [], hasMore: false }
  }
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Get user profile for the photo
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', data.user_id)
      .single()
    
    return {
      ...data,
      user: {
        name: profile ? (profile.full_name || profile.username) : 'User',
        avatar: profile?.avatar_url || '/placeholder-user.jpg'
      }
    }
  } catch (error) {
    console.error('Error fetching photo:', error)
    return null
  }
}

export async function deletePhoto(id: string, userId: string): Promise<boolean> {
  // First get the photo to get the image URL
  const photo = await getPhotoById(id)
  
  if (!photo || photo.user_id !== userId) {
    return false
  }
  
  // Delete from the database
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error deleting photo:', error)
    return false
  }
  
  // Extract filename from the URL
  const urlParts = photo.image_url.split('/')
  const fileName = urlParts[urlParts.length - 1]
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('images')
    .remove([fileName])
  
  if (storageError) {
    console.error('Error deleting photo from storage:', storageError)
    // We still return true because the database record was deleted
  }
  
  return true
} 