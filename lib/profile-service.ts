import { supabase } from './supabase'
import { type Photo } from './photo-service'

export type Profile = {
  id: string
  username: string
  full_name?: string
  bio?: string
  avatar_url?: string
  followers_count: number
  following_count: number
  created_at: string
  updated_at: string
}

// Get a user's profile
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    if (!userId) {
      console.error('getProfile: No userId provided');
      return null;
    }

    console.log(`Fetching profile for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
    
    if (!data) {
      console.log(`No profile found for user ID: ${userId}`);
      return null;
    }
    
    // Handle case where data is an array
    const profileData = Array.isArray(data) ? data[0] : data;
    
    console.log('Profile retrieved successfully:', profileData);
    return profileData as Profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Update a user's profile
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ success: boolean, error?: Error }> {
  try {
    if (!userId) {
      throw new Error('No userId provided')
    }

    // Explicitly specify only the fields we want to update to prevent accidental overwrites
    const fieldsToUpdate: Partial<Profile> = {}
    
    if (updates.username !== undefined) fieldsToUpdate.username = updates.username
    if (updates.full_name !== undefined) fieldsToUpdate.full_name = updates.full_name
    if (updates.bio !== undefined) fieldsToUpdate.bio = updates.bio
    if (updates.avatar_url !== undefined) fieldsToUpdate.avatar_url = updates.avatar_url
    
    // Always update the timestamp
    fieldsToUpdate.updated_at = new Date().toISOString()
    
    console.log(`Updating profile for user ${userId} with:`, fieldsToUpdate)
    
    const { error, data } = await supabase
      .from('profiles')
      .update(fieldsToUpdate)
      .eq('id', userId)
      .select()
    
    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }
    
    console.log('Profile updated successfully:', data)
    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Upload a user's avatar
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ success: boolean, url?: string, error?: Error }> {
  try {
    if (!userId || !file) {
      throw new Error('Missing userId or file')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}_${Math.random().toString(36).substring(2)}.${fileExt}`
    
    console.log(`Uploading avatar for user ${userId}, filename: ${fileName}`)
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      throw uploadError
    }
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)
    
    if (!data.publicUrl) {
      throw new Error('Failed to get public URL')
    }
    
    console.log(`Got public URL: ${data.publicUrl}`)
    
    // Update the user's profile with the new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: data.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Error updating profile with avatar URL:', updateError)
      throw updateError
    }
    
    console.log('Avatar updated successfully')
    return { success: true, url: data.publicUrl }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

// Follow a user
export async function followUser(
  followerId: string,
  followedId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Don't follow yourself
    if (followerId === followedId) {
      return { success: false, error: new Error("You cannot follow yourself") }
    }
    
    // Check if already following
    const { data: existing } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle()
    
    if (existing) {
      return { success: true } // Already following
    }
    
    // Create follow relationship
    const { error } = await supabase
      .from('followers')
      .insert({
        id: crypto.randomUUID(),
        follower_id: followerId,
        followed_id: followedId,
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    console.log(`User ${followerId} is now following ${followedId}`);
    
    return { success: true }
  } catch (error) {
    console.error('Error following user:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Unfollow a user
export async function unfollowUser(
  followerId: string,
  followedId: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Delete the follow relationship
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Check if a user is following another user
export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  try {
    // Validate both IDs
    if (!followerId || !followedId) {
      console.log(`isFollowing: Invalid IDs - followerId: ${followerId}, followedId: ${followedId}`);
      return false;
    }
    
    console.log(`Checking if ${followerId} is following ${followedId}`);
    
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Get a user's followers
export async function getFollowers(userId: string): Promise<Profile[]> {
  try {
    if (!userId) {
      console.error('getFollowers: No userId provided');
      return [];
    }

    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower:follower_id (
          id,
          username,
          full_name,
          avatar_url,
          followers_count,
          following_count,
          created_at,
          updated_at
        )
      `)
      .eq('followed_id', userId)
    
    if (error) {
      console.error('Error fetching followers:', error);
      throw error;
    }
    
    // Transform the result to match our Profile type
    return (data || []).map(item => item.follower as unknown as Profile);
  } catch (error) {
    console.error('Error fetching followers:', error)
    return []
  }
}

// Get users followed by a user
export async function getFollowing(userId: string): Promise<Profile[]> {
  try {
    if (!userId) {
      console.error('getFollowing: No userId provided');
      return [];
    }

    const { data, error } = await supabase
      .from('followers')
      .select(`
        followed:followed_id (
          id,
          username,
          full_name,
          avatar_url,
          followers_count,
          following_count,
          created_at,
          updated_at
        )
      `)
      .eq('follower_id', userId)
    
    if (error) {
      console.error('Error fetching following:', error);
      throw error;
    }
    
    // Transform the result to match our Profile type
    return (data || []).map(item => item.followed as unknown as Profile);
  } catch (error) {
    console.error('Error fetching following:', error)
    return []
  }
}

// Helper to create follow notification
async function createFollowNotification(
  followedId: string,
  followerId: string,
  followerProfile: Profile | null
) {
  try {
    if (followerProfile) {
      // Import the notification service dynamically
      const notificationService = await import('./notification-service')
      
      // Check if createNotification exists before calling it
      if (typeof notificationService.createNotification === 'function') {
        await notificationService.createNotification(
          followedId,
          followerId,
          'follow',
          `${followerProfile.username || 'Someone'} started following you`
        )
      } else {
        console.error('createNotification function not found in notification-service')
      }
    }
  } catch (error) {
    console.error('Error creating follow notification:', error)
  }
}

// Get a user's profile by username
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    if (!username) {
      console.error('getProfileByUsername: No username provided');
      return null;
    }

    console.log(`Looking up profile for username: "${username}"`);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

      

    if (error) {
      // If the error is "No rows found", return null instead of throwing
      if (error.code === 'PGRST116') {
        console.log(`No profile found for username: ${username}`);
        return null;
      }
      console.error('Error fetching profile by username:', error);
      throw error;
    }
    
    if (!data) {
      console.log(`No profile found for username: ${username}`);
      return null;
    }
    
    // Make sure we're returning a single object, not an array
    const profileData = Array.isArray(data) ? data[0] : data;
    
    console.log(`Found profile: ${profileData.username} (${profileData.id})`);
    return profileData as Profile;
  } catch (error) {
    console.error('Error fetching profile by username:', error);
    return null;
  }
}

// Get user's photos by username (for profile view)
export async function getUserPhotosByUsername(username: string): Promise<Photo[]> {
  try {
    if (!username) {
      console.error('getUserPhotosByUsername: No username provided');
      return [];
    }

    // First get the user ID from the username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile for photos:', profileError);
      throw profileError;
    }
    
    if (!profile) {
      console.log(`No profile found for username: ${username}`);
      return [];
    }
    
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
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user photos:', error);
      throw error;
    }
    
    // Transform the result to match our Photo type
    return (data || []).map(item => ({
      ...item,
      user: item.user ? {
        username: item.user.username,
        avatar_url: item.user.avatar_url,
        name: item.user.full_name
      } : undefined
    }));
  } catch (error) {
    console.error('Error fetching user photos by username:', error)
    return []
  }
}

// Search profiles by username or full name
export async function searchProfiles(query: string): Promise<Profile[]> {
  try {
    if (!query || query.trim() === '') {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .order('followers_count', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('Error searching profiles:', error);
      throw error;
    }
    
    return data || []
  } catch (error) {
    console.error('Error searching profiles:', error)
    return []
  }
}

// Get popular profiles (by follower count)
export async function getPopularProfiles(limit: number = 10): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('followers_count', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching popular profiles:', error);
      throw error;
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching popular profiles:', error)
    return []
  }
}


// Get a single photo by ID
export async function getPhotoById(photoId: string): Promise<Photo | null> {
  try {
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
    
    if (error) throw error
    
    if (!data) return null
    
    // Transform the result to match our Photo type
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