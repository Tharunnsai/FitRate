"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/lib/auth-context"
import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead, type Notification } from "@/lib/notification-service"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageSquare, Star, UserPlus } from "lucide-react"

export function NotificationsPopover() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  
  // Load notifications when the popover opens
  useEffect(() => {
    async function loadNotifications() {
      if (!user || !open) return
      
      setLoading(true)
      const userNotifications = await getUserNotifications(user.id)
      console.log('Fetched notifications:', userNotifications)
      setNotifications(userNotifications)
      setUnreadCount(userNotifications.filter(n => !n.is_read).length)
      setLoading(false)
    }
    
    loadNotifications()
    
    // Set up polling for new notifications
    const intervalId = setInterval(loadNotifications, 30000) // every 30 seconds
    
    return () => clearInterval(intervalId)
  }, [user, open])
  
  // Mark all as read when closing the popover
  const handleClose = async () => {
    if (user && unreadCount > 0) {
      await markAllNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
    setOpen(false)
  }
  
  if (!user) return null
  
  // Helper function to get avatar fallback
  const getAvatarFallback = (notification: Notification) => {
    if (notification.sender?.username) {
      return notification.sender.username[0].toUpperCase();
    }
    
    return 'U';
  }
  
  // Helper function to get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-3 w-3 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-3 w-3 text-blue-500" />;
      case 'rating':
        return <Star className="h-3 w-3 text-yellow-500" />;
      case 'follow':
        return <UserPlus className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  }
  
  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        ref={popoverRef}
        className="w-80 p-0 max-h-[500px] overflow-hidden flex flex-col"
        align="end"
        onInteractOutside={handleClose}
        onEscapeKeyDown={handleClose}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-auto py-1"
                onClick={handleClose}
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="all" className="flex-1 overflow-hidden">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread" disabled={unreadCount === 0}>
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.sender?.avatar_url || ""} />
                        <AvatarFallback>{getAvatarFallback(notification)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs">{getNotificationIcon(notification.type)}</span>
                          <p className="text-sm font-medium line-clamp-2">{notification.content}</p>
                        </div>
                        {/* If you need to handle photo links, you can extract photo ID from the message or use a different approach */}
                        {notification.type === 'like' || notification.type === 'comment' || notification.type === 'rating' ? (
                          <Link 
                            href={`/photos/${notification.id}`} // This is a fallback, you might need a better way to get photo ID
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                          >
                            View photo
                          </Link>
                        ) : null}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="unread" className="flex-1 overflow-y-auto max-h-[400px]">
            {unreadCount === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No unread notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications
                  .filter(n => !n.is_read)
                  .map(notification => (
                    <div 
                      key={notification.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer bg-blue-50 dark:bg-blue-900/20"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={notification.sender?.avatar_url || ""} />
                          <AvatarFallback>{getAvatarFallback(notification)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{getNotificationIcon(notification.type)}</span>
                            <p className="text-sm font-medium line-clamp-2">{notification.content}</p>
                          </div>
                          {/* If you need to handle photo links, you can extract photo ID from the message or use a different approach */}
                          {notification.type === 'like' || notification.type === 'comment' || notification.type === 'rating' ? (
                            <Link 
                              href={`/photos/${notification.id}`} // This is a fallback, you might need a better way to get photo ID
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                            >
                              View photo
                            </Link>
                          ) : null}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
} 