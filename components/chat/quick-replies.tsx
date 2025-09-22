"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Package, DollarSign, MessageSquare, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"

interface QuickReply {
  id: string
  reply_text: string
  category: "general" | "availability" | "pricing" | "hours"
}

interface QuickRepliesProps {
  shopId: string
  onQuickReply: (message: string) => void
  isCustomer: boolean
  conversationId?: string
}

const defaultCustomerReplies = [
  { text: "Are you open?", category: "hours", icon: Clock },
  { text: "Is this item available?", category: "availability", icon: Package },
  { text: "What is the price?", category: "pricing", icon: DollarSign },
]

const shopkeeperQuickActions = [
  { text: "In stock ✓", type: "availability", response: "Yes, this item is currently in stock!" },
  { text: "Out of stock ✗", type: "availability", response: "Sorry, this item is currently out of stock." },
  { text: "We're open ✓", type: "hours", response: "Yes, we are currently open! Feel free to visit us." },
  { text: "We're closed ✗", type: "hours", response: "We are currently closed. Please check our opening hours." },
]

export function QuickReplies({ shopId, onQuickReply, isCustomer, conversationId }: QuickRepliesProps) {
  const [customReplies, setCustomReplies] = useState<QuickReply[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (!isCustomer) {
      loadCustomReplies()
    }
  }, [shopId, isCustomer])

  const loadCustomReplies = async () => {
    const { data, error } = await supabase
      .from("quick_reply_templates")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .limit(6)

    if (data && !error) {
      setCustomReplies(data)
    }
  }

  const handleQuickAction = async (action: (typeof shopkeeperQuickActions)[0]) => {
    if (!conversationId) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: action.response,
          shopId,
        }),
      })

      if (response.ok) {
        // Optionally show success feedback
      }
    } catch (error) {
      console.error("Error sending quick action:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "hours":
        return Clock
      case "availability":
        return Package
      case "pricing":
        return DollarSign
      default:
        return MessageSquare
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hours":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
      case "availability":
        return "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
      case "pricing":
        return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
    }
  }

  if (isCustomer) {
    // Customer quick replies
    const repliesToShow = customReplies.length > 0 ? customReplies : defaultCustomerReplies

    return (
      <Card className="p-4 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick questions:</h4>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {repliesToShow.slice(0, 3).map((reply, index) => {
              const isCustomReply = "id" in reply
              const text = isCustomReply ? reply.reply_text : reply.text
              const category = isCustomReply ? reply.category : reply.category
              const Icon = isCustomReply ? getCategoryIcon(category) : reply.icon

              return (
                <motion.div
                  key={isCustomReply ? reply.id : index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickReply(text)}
                    className={`${getCategoryColor(category)} border transition-all duration-200 hover:scale-105`}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {text}
                  </Button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </Card>
    )
  } else {
    // Shopkeeper quick actions
    return (
      <Card className="p-4 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick responses:</h4>
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence>
            {shopkeeperQuickActions.map((action, index) => (
              <motion.div
                key={action.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className={`w-full justify-start text-left transition-all duration-200 hover:scale-105 ${
                    action.text.includes("✓")
                      ? "border-green-200 hover:bg-green-50 hover:text-green-700"
                      : "border-red-200 hover:bg-red-50 hover:text-red-700"
                  }`}
                >
                  {action.text.includes("✓") ? (
                    <Check className="h-3 w-3 mr-2 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 mr-2 text-red-600" />
                  )}
                  {action.text}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-3 pt-3 border-t">
          <Badge variant="secondary" className="text-xs">
            One-tap responses for busy times
          </Badge>
        </div>
      </Card>
    )
  }
}
