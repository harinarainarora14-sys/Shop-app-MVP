"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

interface StartChatButtonProps {
  shopId: string
  shopName: string
  shopImage?: string
  isOpen: boolean
}

export function StartChatButton({ shopId, shopName, shopImage, isOpen }: StartChatButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStartChat = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      })

      const data = await response.json()
      if (data.conversationId) {
        router.push(`/chat/${data.conversationId}`)
      }
    } catch (error) {
      console.error("Error starting chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        onClick={handleStartChat}
        disabled={isLoading}
        className="w-full rounded-2xl h-12 text-base font-medium bg-primary hover:bg-primary/90"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Starting chat...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat with {shopName}
            {!isOpen && <span className="text-xs opacity-75">(Closed)</span>}
          </div>
        )}
      </Button>
    </motion.div>
  )
}
