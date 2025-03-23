import { supabase } from './supabase'

export type Profile = {
  id: string
  username: string
  full_name: string
  bio: string
  avatar_url: string
  created_at?: string
  updated_at?: string
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    // If the profile doesn't exist, create a default one
    if (error.code === 'PGRST116') {
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const defaultProfile = {
          id: userId,
          username: userData.user.email?.split('@')[0] || '',
          full_name: '',
          bio: '',
          avatar_url: '',
          updated_at: new Date().toISOString()
        }
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(defaultProfile)
        
        if (!insertError) {
          return defaultProfile
        }
      }
    }
    
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data
}

export async function updateProfile(profile: Partial<Profile>): Promise<{ success: boolean, error?: Error }> {
  // Add updated_at timestamp
  const updates = {
    ...profile,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id)
  
  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error }
  }
  
  return { success: true }
}

export async function uploadAvatar(userId: string, file: File): Promise<{ success: boolean, url?: string, error?: Error }> {
  // Create a unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`
  
  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    return { success: false, error: uploadError }
  }
  
  // Get the public URL
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)
  
  // Update the user's profile with the new avatar URL
  const { success, error } = await updateProfile({
    id: userId,
    avatar_url: data.publicUrl
  })
  
  if (!success) {
    return { success: false, error }
  }
  
  return { success: true, url: data.publicUrl }
} 