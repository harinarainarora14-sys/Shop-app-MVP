"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, BellOff, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { EnhancedNotificationCard } from "./enhanced-notification-card"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  shops?: {
    id: string
    name: string
    address: string
    phone?: string
    is_open: boolean
  }
  products?: {
    id: string
    name: string
    price: number
    stock_quantity: number
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

  const handleNotificationUpdate = (id: string, updates: Partial<Notification>) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, ...updates } : n)))
  }

  const handleNotificationDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
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

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card/80 backdrop-blur-xl shadow-sm"
      >
        <div className="flex h-20 items-center px-6 max-w-7xl mx-auto">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </motion.div>
          <div className="ml-4">
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-base text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <div className="ml-auto">
            {unreadCount > 0 && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="rounded-2xl border-2 bg-transparent"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="p-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {notifications.length === 0 ? (
            <motion.div
              key="no-notifications"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mx-auto mb-6"
                  >
                    <BellOff className="h-10 w-10 text-muted-foreground" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">No Notifications</h3>
                  <p className="text-base text-muted-foreground mb-6 text-pretty max-w-md mx-auto">
                    You'll receive notifications when shops open, items come back in stock, or new products are added.
                  </p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard")}
                      className="rounded-2xl border-2 px-6 py-3 text-base"
                    >
                      Browse Shops
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="notifications-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EnhancedNotificationCard
                    notification={notification}
                    userId={userId}
                    onUpdate={handleNotificationUpdate}
                    onDelete={handleNotificationDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
