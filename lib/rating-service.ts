import { supabase } from './supabase'

export type Rating = {
  id: string
  user_id: string
  photo_id: string
  rating: number
  created_at: string
}

// Rate a photo
export async function ratePhoto(
  userId: string,
  photoId: string,
  rating: number
): Promise<{ success: boolean, error?: Error }> {
  try {
    console.log(`Rating photo: userId=${userId}, photoId=${photoId}, rating=${rating}`);
    
    // Check if user has already rated this photo
    const { data: existingRating, error: checkError } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .maybeSingle()
    
    if (checkError) {
      console.error('Error checking existing rating:', checkError);
      throw checkError;
    }
    
    console.log('Existing rating:', existingRating);
    
    let result;
    
    if (existingRating) {
      // Update existing rating
      result = await supabase
        .from('ratings')
        .update({ 
          rating,
          created_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
    } else {
      // Create a new UUID for the rating
      const ratingId = crypto.randomUUID();
      
      // Insert new rating
      result = await supabase
        .from('ratings')
        .insert({
          id: ratingId,
          user_id: userId,
          photo_id: photoId,
          rating,
          created_at: new Date().toISOString()
        })
    }
    
    if (result.error) {
      console.error('Error saving rating:', result.error);
      throw result.error;
    }
    
    console.log('Rating saved successfully');
    
    // No longer creating notifications for ratings
    
    return { success: true }
  } catch (error) {
    console.error('Error rating photo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Get a user's rating for a photo
export async function getUserRating(
  userId: string, 
  photoId: string
): Promise<number | null> {
  try {
    // Using select('*') instead of select('rating') to avoid 406 error
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('photo_id', photoId)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching user rating:', error)
      throw error
    }
    
    return data ? data.rating : null
  } catch (error) {
    console.error('Error getting user rating:', error)
    return null
  }
}

// Get a user's ratings for multiple photos
export async function getUserRatings(
  userId: string
): Promise<Record<string, number>> {
  try {
    // If there are no photos, return an empty object
    const { data: photos } = await supabase
      .from('photos')
      .select('id')
      .limit(100)
    
    if (!photos || photos.length === 0) {
      return {}
    }
    
    const photoIds = photos.map(photo => photo.id)
    
    const { data, error } = await supabase
      .from('ratings')
      .select('photo_id, rating')
      .eq('user_id', userId)
      .in('photo_id', photoIds)
    
    if (error) throw error
    
    // Convert array of ratings to a map of photo_id -> rating
    const ratingsMap = (data || []).reduce((map, item) => {
      map[item.photo_id] = item.rating
      return map
    }, {} as Record<string, number>)
    
    return ratingsMap
  } catch (error) {
    console.error('Error getting user ratings:', error)
    return {}
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
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('user_id', userId);

    // Get ratings for user's photos if they exist
    const photoIds = userPhotos ? userPhotos.map(photo => photo.id) : [];

    const { data: ratingsReceived } = photoIds.length > 0 
      ? await supabase
          .from('ratings')
          .select('rating')
          .in('photo_id', photoIds)
      : { data: [] };
    
    // Calculate averages
    const averageRatingGiven = ratingsGiven && ratingsGiven.length > 0
      ? ratingsGiven.reduce((sum, r) => sum + r.rating, 0) / ratingsGiven.length
      : 0;
    
    const averageRatingReceived = ratingsReceived && ratingsReceived.length > 0
      ? ratingsReceived.reduce((sum, r) => sum + r.rating, 0) / ratingsReceived.length
      : 0;
    
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