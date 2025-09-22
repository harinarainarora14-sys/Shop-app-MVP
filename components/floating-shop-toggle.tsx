"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Store, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Shop } from "@/lib/types"

interface FloatingShopToggleProps {
  shop: Shop
  onToggle: (isOpen: boolean) => void
}

export function FloatingShopToggle({ shop, onToggle }: FloatingShopToggleProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    // Load last updated time
    if (shop.updated_at) {
      setLastUpdated(new Date(shop.updated_at))
    }
  }, [shop.updated_at])

  const handleToggle = async () => {
    if (isToggling) return

    setIsToggling(true)

    // Haptic feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      const newStatus = !shop.is_open
      const now = new Date()

      const { error } = await supabase
        .from("shops")
        .update({
          is_open: newStatus,
          updated_at: now.toISOString(),
        })
        .eq("id", shop.id)

      if (error) throw error

      setLastUpdated(now)
      onToggle(newStatus)

      toast({
        title: "Shop Status Updated",
        description: `Your shop is now ${newStatus ? "open" : "closed"}`,
      })
    } catch (error) {
      console.error("Error updating shop status:", error)
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative">
        <Button
          onClick={handleToggle}
          disabled={isToggling}
          className={`
            h-16 w-16 rounded-full shadow-2xl border-4 transition-all duration-300
            ${
              shop.is_open
                ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-300 shadow-emerald-500/30"
                : "bg-red-500 hover:bg-red-600 border-red-300 shadow-red-500/30"
            }
          `}
        >
          <AnimatePresence mode="wait">
            {isToggling ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                className="animate-spin"
              >
                <Store className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="store"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Store className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Status indicator */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2">
          <Badge
            variant={shop.is_open ? "default" : "secondary"}
            className={`
              text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-lg
              ${shop.is_open ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"}
            `}
          >
            {shop.is_open ? "OPEN" : "CLOSED"}
          </Badge>
        </motion.div>

        {/* Last updated tooltip */}
        {lastUpdated && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap backdrop-blur-sm"
          >
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {formatLastUpdated(lastUpdated)}</span>
            </div>
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-black/80" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
