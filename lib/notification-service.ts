import { supabase } from './supabase'

export type Notification = {
  id: string
  user_id: string
  sender_id: string
  type: 'like' | 'comment' | 'follow' | 'rating'
  content: string
  is_read: boolean
  created_at: string
  sender?: {
    username: string
    avatar_url?: string
  }
}

// Create a notification
export async function createNotification(
  userId: string,
  senderId: string,
  type: 'like' | 'comment' | 'follow' | 'rating',
  content: string
): Promise<{ success: boolean, error?: Error }> {
  try {
    // Don't create notifications for self-actions
    if (userId === senderId) {
      return { success: true }
    }
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        sender_id: senderId,
        type,
        content,
        is_read: false,
        created_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    }
  }
}

// Get user's notifications with sender info
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    // First, get basic notification data
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sender:sender_id (
          username,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    // Now let's try to add photo data if the photo_id column exists
    let notificationsWithData = data || [];
    
    // If we have notifications with photo_ids, try to fetch the photo info
    const photoIds = notificationsWithData
      .filter(n => n.photo_id)
      .map(n => n.photo_id);
    
    if (photoIds.length > 0) {
      try {
        const { data: photos } = await supabase
          .from('photos')
          .select('id, title, image_url')
          .in('id', photoIds);
        
        if (photos) {
          const photoMap = photos.reduce((acc, photo) => {
            acc[photo.id] = photo;
            return acc;
          }, {} as Record<string, any>);
          
          notificationsWithData = notificationsWithData.map(notification => ({
            ...notification,
            photo: notification.photo_id ? photoMap[notification.photo_id] : undefined
          }));
        }
      } catch (photoError) {
        // If this fails, we'll just continue without photo data
        console.error('Error fetching photo data for notifications:', photoError);
      }
    }
    
    return notificationsWithData;
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return false
  }
}

// Mark a specific notification as read
export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
} 