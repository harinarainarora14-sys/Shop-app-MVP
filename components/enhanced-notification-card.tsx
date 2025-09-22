"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Package, Store, Plus, Check, Trash2, MapPin, Clock, Phone } from "lucide-react"
import Link from "next/link"

interface EnhancedNotification {
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

interface EnhancedNotificationCardProps {
  notification: EnhancedNotification
  userId: string
  onUpdate: (id: string, updates: Partial<EnhancedNotification>) => void
  onDelete: (id: string) => void
}

export function EnhancedNotificationCard({ notification, userId, onUpdate, onDelete }: EnhancedNotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "back_in_stock":
        return <Package className="h-5 w-5 text-emerald-600" />
      case "shop_opened":
        return <Store className="h-5 w-5 text-blue-600" />
      case "new_product":
        return <Plus className="h-5 w-5 text-purple-600" />
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "back_in_stock":
        return "bg-emerald-50 border-emerald-200"
      case "shop_opened":
        return "bg-blue-50 border-blue-200"
      case "new_product":
        return "bg-purple-50 border-purple-200"
      default:
        return "bg-muted/20 border-muted"
    }
  }

  const markAsRead = async () => {
    if (notification.is_read) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id)
        .eq("user_id", userId)

      if (error) throw error

      onUpdate(notification.id, { is_read: true })
      toast({
        title: "Marked as Read",
        description: "Notification has been marked as read",
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", notification.id).eq("user_id", userId)

      if (error) throw error

      onDelete(notification.id)
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
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }}>
      <Card
        className={`
        rounded-2xl border-2 transition-all duration-300 hover:shadow-lg
        ${
          !notification.is_read
            ? `${getNotificationColor(notification.type)} shadow-md`
            : "bg-card/60 border-muted hover:shadow-md"
        }
      `}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <motion.div whileHover={{ scale: 1.1 }} className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </motion.div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{notification.title}</h3>
                  {!notification.is_read && (
                    <Badge variant="default" className="mt-1 text-xs rounded-xl">
                      New
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{formatDate(notification.created_at)}</span>
                  <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isLoading} className="rounded-xl">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-base text-muted-foreground leading-relaxed">{notification.message}</p>

              {/* Enhanced Shop Information */}
              {notification.shops && (
                <div className="p-4 bg-background/50 rounded-2xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{notification.shops.name}</span>
                    </div>
                    <Badge
                      variant={notification.shops.is_open ? "default" : "secondary"}
                      className="rounded-xl text-xs"
                    >
                      {notification.shops.is_open ? "Open" : "Closed"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{notification.shops.address}</span>
                    </div>
                    {notification.shops.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{notification.shops.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Currently {notification.shops.is_open ? "open" : "closed"}</span>
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="sm" asChild className="w-full rounded-2xl border-2 bg-transparent">
                      <Link href={`/shop/${notification.shops.id}`}>Visit Shop</Link>
                    </Button>
                  </motion.div>
                </div>
              )}

              {/* Enhanced Product Information */}
              {notification.products && (
                <div className="p-4 bg-background/50 rounded-2xl border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{notification.products.name}</span>
                    </div>
                    <Badge variant="outline" className="rounded-xl text-base font-semibold">
                      ${notification.products.price}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Stock:</span>
                    <Badge
                      variant={notification.products.stock_quantity > 0 ? "default" : "destructive"}
                      className="rounded-xl text-xs"
                    >
                      {notification.products.stock_quantity > 0
                        ? `${notification.products.stock_quantity} available`
                        : "Out of stock"}
                    </Badge>
                  </div>

                  {notification.shops && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full rounded-2xl border-2 bg-transparent"
                      >
                        <Link href={`/shop/${notification.shops.id}`}>View in Shop</Link>
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}

              {!notification.is_read && (
                <div className="pt-2">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAsRead}
                      disabled={isLoading}
                      className="rounded-2xl border-2 bg-transparent"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Read
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
