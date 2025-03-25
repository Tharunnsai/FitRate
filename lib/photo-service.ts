import { supabase } from './supabase'

export type Photo = {
  id: string
  user_id: string
  title: string
  description?: string
  image_url: string
  rating: number
  votes_count: number
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  // Joined fields
  user?: {
    username: string
    avatar_url?: string
    name?: string
  }
}

export type Comment = {
  id: string
  photo_id: string
  user_id: string
  content: string
  created_at: string
  user?: {
    username: string
    avatar_url?: string
  }
}

// Get all photos with optional filtering and pagination
export async function getAllPhotos(
  options: {
    page?: number, 
    limit?: number, 
    orderBy?: 'latest' | 'popular' | 'top_rated',
    userId?: string
  } = {}
): Promise<Photo[]> {
  try {
    const { 
      page = 1, 
      limit = 20, 
      orderBy = 'latest',
      userId
    } = options
    
    let query = supabase
      .from('photos')
      .select(`
        *,
        user:user_id (
          username,
          avatar_url,
          full_name
        )
      `)
    
    // Apply filtering
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    // Apply ordering
    if (orderBy === 'latest') {
      query = query.order('created_at', { ascending: false })
    } else if (orderBy === 'popular') {
      query = query.order('votes_count', { ascending: false })
    } else if (orderBy === 'top_rated') {
      query = query.order('rating', { ascending: false })
    }
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Transform the result to match our Photo type
    return (data || []).map(item => ({
      ...item,
      user: item.user ? {
        username: item.user.username,
        avatar_url: item.user.avatar_url,
        name: item.user.full_name
      } : undefined
    }))
  } catch (error) {
    console.error('Error fetching photos:', error)
    return []
  }
}

// Get a single photo by ID
export async function getPhoto(photoId: string): Promise<Photo | null> {
  try {
    if (!photoId) {
      console.error('getPhoto: No photoId provided')
      return null
    }
    
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        user:user_id (
          username,
          avatar_url,
          full_name
        )
      `)
      .eq('id', photoId)
      .single()
    
    if (error) {
      console.error('Error fetching photo:', error)
      throw error
    }
    
    if (!data) return null
    
    // Check if data has a numeric index structure (array-like)
    if (data[0] && typeof data[0] === 'object') {
      console.log('Data has array-like structure, extracting first item')
      const photoData = data[0]
      
      // Transform the result to match our Photo type
      return {
        ...photoData,
        user: photoData.user ? {
          username: photoData.user.username,
          avatar_url: photoData.user.avatar_url,
          name: photoData.user.full_name
        } : undefined
      }
    }
    
    // Normal object structure
    return {
      ...data,
      user: data.user ? {
        username: data.user.username,
        avatar_url: data.user.avatar_url,
        name: data.user.full_name
      } : undefined
    }
  } catch (error) {
    console.error('Error fetching photo by ID:', error)
    return null
  }
}

// Get photos uploaded by a specific user
export async function getUserPhotos(userId: string): Promise<Photo[]> {
  return getAllPhotos({ userId, orderBy: 'latest', limit: 50 })
}

// Upload a new photo
export async function uploadPhoto(
  userId: string,
  file: File,
  metadata: { title: string, description?: string }
): Promise<{ success: boolean, photoId?: string, error?: Error }> {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId.slice(0, 8)}_${Date.now()}.${fileExt}`
    
    // Upload the image file to storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)
    
    // Create the photo record
    const photoId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('photos')
      .insert({
        id: photoId,
        user_id: userId,
        title: metadata.title,
        description: metadata.description || null,
        image_url: urlData.publicUrl,
        rating: 0,
        votes_count: 0,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (insertError) throw insertError
    
    return { success: true, photoId }
  } catch (error) {
    console.error('Error uploading photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Update a photo's metadata
export async function updatePhoto(
  photoId: string,
  userId: string,
  updates: { title?: string, description?: string }
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Verify ownership
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('user_id')
      .eq('id', photoId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Check if photo exists and has the expected structure
    if (!photo) {
      return { 
        success: false, 
        error: new Error('Photo not found') 
      }
    }
    
    // Handle both array-like and object structures
    const photoUserId = photo[0]?.user_id || photo.user_id
    
    if (photoUserId !== userId) {
      return { 
        success: false, 
        error: new Error('You do not have permission to update this photo') 
      }
    }
    
    // Update the photo
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', photoId)
    
    if (updateError) throw updateError
    
    return { success: true }
  } catch (error) {
    console.error('Error updating photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Delete a photo and all related data
export async function deletePhoto(
  photoId: string, 
  userId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // First, verify the user owns this photo
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('image_url, user_id')
      .eq('id', photoId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    // Handle both array-like and object structures
    const photoData = photo[0] || photo;
    
    // Safety check to ensure photoData exists and has user_id
    if (!photoData || !photoData.user_id) {
      console.error('Invalid photo data structure:', JSON.stringify(photo, null, 2));
      throw new Error('Invalid photo data structure');
    }
    
    // Security check - ensure the user owns this photo
    if (photoData.user_id !== userId) {
      throw new Error('You do not have permission to delete this photo');
    }
    
    // Extract the filename from the URL
    const imageUrl = photoData.image_url;
    const fileName = imageUrl ? imageUrl.split('/').pop() : null;
    
    // Begin a transaction to delete all related data
    // 1. Delete comments
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('photo_id', photoId);
    
    if (commentsError) throw commentsError;
    
    // 2. Delete ratings
    const { error: ratingsError } = await supabase
      .from('ratings')
      .delete()
      .eq('photo_id', photoId);
    
    if (ratingsError) throw ratingsError;
    
    // 3. Delete likes
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .eq('photo_id', photoId);
    
    if (likesError) throw likesError;
    
    // 4. Delete the photo record
    const { error: photoError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    
    if (photoError) throw photoError;
    
    // 5. Delete the image file from storage
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([fileName]);
      
      if (storageError) {
        console.error('Error deleting image file:', storageError);
        // We'll continue even if storage deletion fails
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

// Like a photo (simplified - no notification creation)
export async function likePhoto(
  userId: string,
  photoId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .maybeSingle()
    
    if (existingLike) {
      return { success: true } // Already liked
    }
    
    // Create a new UUID for the like
    const likeId = crypto.randomUUID()
    
    // Insert new like
    const { error } = await supabase
      .from('likes')
      .insert({
        id: likeId,
        user_id: userId,
        photo_id: photoId,
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    // No notification creation
    
    return { success: true }
  } catch (error) {
    console.error('Error liking photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Unlike a photo
export async function unlikePhoto(
  userId: string,
  photoId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('photo_id', photoId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error unliking photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Check if a user has liked a photo
export async function hasLikedPhoto(
  userId: string,
  photoId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .maybeSingle()
    
    if (error) throw error
    
    return !!data
  } catch (error) {
    console.error('Error checking like status:', error)
    return false
  }
}

// Get comments for a photo
export async function getPhotoComments(photoId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (
          username,
          avatar_url
        )
      `)
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return (data || []).map(comment => ({
      ...comment,
      user: comment.user ? {
        username: comment.user.username,
        avatar_url: comment.user.avatar_url
      } : undefined
    }))
  } catch (error) {
    console.error('Error fetching comments:', error)
    return []
  }
}

// Add a comment to a photo (simplified - no notification creation)
export async function addComment(
  userId: string,
  photoId: string,
  content: string
): Promise<{ success: boolean, commentId?: string, error?: Error }> {
  try {
    // Validate
    if (!content.trim()) {
      return { 
        success: false, 
        error: new Error('Comment cannot be empty') 
      }
    }
    
    // Create a new UUID for the comment
    const commentId = crypto.randomUUID()
    
    // Insert comment
    const { error } = await supabase
      .from('comments')
      .insert({
        id: commentId,
        user_id: userId,
        photo_id: photoId,
        content: content.trim(),
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    // No notification creation
    
    return { success: true, commentId }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Delete a comment
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Verify ownership
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()
    
    if (fetchError) throw fetchError
    
    if (comment.user_id !== userId) {
      return { 
        success: false, 
        error: new Error('You do not have permission to delete this comment') 
      }
    }
    
    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Get user's photos by username
export async function getUserPhotosByUsername(username: string): Promise<Photo[]> {
  try {
    if (!username) {
      console.error('getUserPhotosByUsername: No username provided');
      return [];
    }
    
    // First get the user ID from the username
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()
    
    if (profileError) {
      console.error('Error fetching profile for photos:', profileError);
      throw profileError;
    }
    
    if (!profileData) {
      console.log(`No profile found for username: ${username}`);
      return [];
    }
    
    // Make sure we have a valid profile object, not an array
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    
    if (!profile || !profile.id) {
      console.log(`Invalid profile data for username: ${username}`);
      return [];
    }
    
    console.log(`Fetching photos for user ID: ${profile.id}`);
    
    // Then get the photos for that user
    const { data, error } = await supabase
      .from('photos')
      .select(`
        *,
        user:user_id (
          username,
          avatar_url,
          full_name
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform the result to match our Photo type
    return (data || []).map(item => ({
      ...item,
      user: item.user ? {
        username: item.user.username,
        avatar_url: item.user.avatar_url,
        name: item.user.full_name
      } : undefined
    }))
  } catch (error) {
    console.error('Error fetching user photos by username:', error)
    return []
  }
}
