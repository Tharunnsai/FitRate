import { supabase } from './supabase'

export type Rating = {
  id: string
  user_id: string
  photo_id: string
  rating: number
  created_at: string
}

export type Activity = {
  id: string
  user_id: string
  activity_type: 'rating' | 'like' | 'comment' | 'upload'
  photo_id: string
  rating?: number
  created_at: string
  // These will be populated from joins
  photo?: {
    title: string
    image_url: string
  }
  user?: {
    name: string
    avatar: string
  }
}

// Rate a photo
export async function ratePhoto(
  userId: string,
  photoId: string,
  rating: number
): Promise<{ success: boolean, error?: any }> {
  try {
    // Check if user has already rated this photo
    const { data: existingRating, error: checkError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .maybeSingle()
    
    if (checkError) throw checkError
    
    let result;
    
    if (existingRating) {
      // Update existing rating
      result = await supabase
        .from('ratings')
        .update({ 
          rating,
          created_at: new Date().toISOString() // Update timestamp for activity tracking
        })
        .eq('id', existingRating.id)
    } else {
      // Insert new rating
      result = await supabase
        .from('ratings')
        .insert({
          user_id: userId,
          photo_id: photoId,
          rating,
          created_at: new Date().toISOString()
        })
    }
    
    if (result.error) throw result.error
    
    return { success: true }
  } catch (error) {
    console.error('Error rating photo:', error)
    return { success: false, error }
  }
}

// Get a user's rating for a specific photo
export async function getUserRating(
  userId: string,
  photoId: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .single()
    
    if (error) {
      // If no rating found, return null
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }
    
    return data.rating
  } catch (error) {
    console.error('Error getting user rating:', error)
    return null
  }
}

// Get all user ratings
export async function getUserRatings(userId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('photo_id, rating')
      .eq('user_id', userId)
    
    if (error) throw error
    
    // Convert to a map of photo_id -> rating
    return (data || []).reduce((map, item) => {
      map[item.photo_id] = item.rating
      return map
    }, {})
  } catch (error) {
    console.error('Error getting user ratings:', error)
    return {}
  }
}

// Get recent activities
export async function getRecentActivities(
  limit: number = 10
): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        photo:photo_id (
          title,
          image_url
        ),
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    // Transform the data
    return (data || []).map(activity => {
      const profile = activity.profiles || {}
      return {
        ...activity,
        profiles: undefined,
        user: {
          name: profile.full_name || profile.username || 'User',
          avatar: profile.avatar_url || '/placeholder-user.jpg'
        }
      }
    })
  } catch (error) {
    console.error('Error getting recent activities:', error)
    return []
  }
}

// Get user's recent activities
export async function getUserActivities(
  userId: string,
  limit: number = 10
): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        photo:photo_id (
          title,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error getting user activities:', error)
    return []
  }
}

// Add this function to get user stats
export async function getUserStats(userId: string): Promise<{
  totalUploads: number
  totalRatings: number
  averageRatingGiven: number
  averageRatingReceived: number
  ratingDistribution: {
    '9-10': number,
    '7-8': number,
    '5-6': number,
    '1-4': number
  }
}> {
  try {
    // Get total uploads
    const { count: totalUploads } = await supabase
      .from('photos')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
    
    // Get total ratings given
    const { count: totalRatings } = await supabase
      .from('ratings')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
    
    // Get average rating given
    const { data: ratingsGiven } = await supabase
      .from('ratings')
      .select('rating')
      .eq('user_id', userId)
    
    // Get average rating received
    const { data: ratingsReceived } = await supabase
      .from('ratings')
      .select('rating')
      .eq('photo_id', 'in', (subquery) => {
        return subquery
          .from('photos')
          .select('id')
          .eq('user_id', userId)
      })
    
    // Calculate averages
    const averageRatingGiven = ratingsGiven && ratingsGiven.length > 0
      ? ratingsGiven.reduce((sum, r) => sum + r.rating, 0) / ratingsGiven.length
      : 0
    
    const averageRatingReceived = ratingsReceived && ratingsReceived.length > 0
      ? ratingsReceived.reduce((sum, r) => sum + r.rating, 0) / ratingsReceived.length
      : 0
    
    // Calculate rating distribution
    const distribution = {
      '9-10': 0,
      '7-8': 0,
      '5-6': 0,
      '1-4': 0
    }
    
    if (ratingsReceived && ratingsReceived.length > 0) {
      ratingsReceived.forEach(r => {
        if (r.rating >= 9) distribution['9-10']++
        else if (r.rating >= 7) distribution['7-8']++
        else if (r.rating >= 5) distribution['5-6']++
        else distribution['1-4']++
      })
      
      // Convert to percentages
      const total = ratingsReceived.length
      distribution['9-10'] = Math.round((distribution['9-10'] / total) * 100)
      distribution['7-8'] = Math.round((distribution['7-8'] / total) * 100)
      distribution['5-6'] = Math.round((distribution['5-6'] / total) * 100)
      distribution['1-4'] = Math.round((distribution['1-4'] / total) * 100)
    }
    
    return {
      totalUploads: totalUploads || 0,
      totalRatings: totalRatings || 0,
      averageRatingGiven: parseFloat(averageRatingGiven.toFixed(1)),
      averageRatingReceived: parseFloat(averageRatingReceived.toFixed(1)),
      ratingDistribution: distribution
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      totalUploads: 0,
      totalRatings: 0,
      averageRatingGiven: 0,
      averageRatingReceived: 0,
      ratingDistribution: {
        '9-10': 0,
        '7-8': 0,
        '5-6': 0,
        '1-4': 0
      }
    }
  }
} 