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
): Promise<{ success: boolean, photo?: Photo, error?: Error }> {
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
    // First, get the photos without the join
    let query = supabase
      .from('photos')
      .select('*')
    
    // Apply sorting
    if (sortBy === 'recent') {
      query = query.order('created_at', { ascending: false })
    } else if (sortBy === 'top-rated') {
      query = query.order('rating', { ascending: false })
    } else if (sortBy === 'most-liked') {
      query = query.order('likes_count', { ascending: false })
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    query = query.range(from, to)
    
    const { data, error, count } = await query
    
    if (error) {
      throw error
    }
    
    // Get user profiles separately
    const userIds = Array.from(new Set(data.map(photo => photo.user_id)))
    
    let profiles = []
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
      
      profiles = profilesData || []
    }
    
    // Create a map for quick lookup
    const profileMap = profiles.reduce((map, profile) => {
      map[profile.id] = profile
      return map
    }, {})
    
    // Transform the data to match our Photo type
    const photos: Photo[] = data.map(item => ({
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      rating: item.rating || 0,
      votes_count: item.votes_count || 0,
      likes_count: item.likes_count || 0,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user: {
        name: profileMap[item.user_id]?.username || 'Anonymous',
        avatar: profileMap[item.user_id]?.avatar_url || '/placeholder-user.jpg'
      }
    }))
    
    // Check if there are more photos
    const hasMore = count ? from + photos.length < count : false
    
    return { photos, hasMore }
  } catch (error) {
    console.error('Error fetching photos:', error)
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