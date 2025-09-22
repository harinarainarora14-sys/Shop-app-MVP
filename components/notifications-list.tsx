"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Bell, BellOff, Package, Store, Plus, Check, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  shops?: {
    name: string
    address: string
  }
  products?: {
    name: string
    price: number
  }
}

export function NotificationsList({
  notifications: initialNotifications,
  userId,
}: { notifications: Notification[]; userId: string }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "back_in_stock":
        return <Package className="h-5 w-5 text-primary" />
      case "shop_opened":
        return <Store className="h-5 w-5 text-accent" />
      case "new_product":
        return <Plus className="h-5 w-5 text-chart-1" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "back_in_stock":
        return "default"
      case "shop_opened":
        return "secondary"
      case "new_product":
        return "outline"
      default:
        return "outline"
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId)

      if (error) throw error

      setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)

      if (unreadIds.length === 0) {
        toast({
          title: "No Unread Notifications",
          description: "All notifications are already marked as read",
        })
        return
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds)
        .eq("user_id", userId)

      if (error) throw error

      setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
      toast({
        title: "All Marked as Read",
        description: "All notifications have been marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", userId)

      if (error) throw error

      setNotifications(notifications.filter((n) => n.id !== notificationId))
      toast({
        title: "Notification Deleted",
        description: "Notification has been removed",
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="ml-4">
            <h1 className="font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <div className="ml-auto">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={isLoading}>
                <Check className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BellOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
              <p className="text-muted-foreground mb-4">
                You'll receive notifications when shops open, items come back in stock, or new products are added.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Browse Shops
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all ${!notification.is_read ? "border-primary/50 bg-primary/5" : "hover:shadow-md"}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{notification.title}</h3>
                          {!notification.is_read && (
                            <Badge variant="default" className="mt-1 text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{formatDate(notification.created_at)}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{notification.message}</p>

                      {notification.shops && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Store className="h-4 w-4" />
                          <span>{notification.shops.name}</span>
                        </div>
                      )}

                      {notification.products && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{notification.products.name}</span>
                          <Badge variant={getNotificationColor(notification.type)}>
                            ${notification.products.price}
                          </Badge>
                        </div>
                      )}

                      {!notification.is_read && (
                        <div className="pt-2">
                          <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Read
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
