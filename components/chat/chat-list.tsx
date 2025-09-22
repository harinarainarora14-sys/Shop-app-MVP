"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MessageCircle, Clock, User, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Conversation {
  id: string
  customer_id: string
  shop_id: string
  last_message_at: string
  is_active: boolean
  customer: {
    full_name: string
    email: string
  }
  shop: {
    name: string
    image_url?: string
  }
  messages: Array<{
    content: string
    created_at: string
    message_type: string
    sender_id: string | null
  }>
}

interface ChatListProps {
  isCustomer: boolean
  currentUserId: string
}

export function ChatList({ isCustomer, currentUserId }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadConversations()

    // Set up real-time subscription for new conversations
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/chat/conversations")
      const data = await response.json()

      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1]
      return {
        content: lastMessage.content,
        time: lastMessage.created_at,
        isSystem: lastMessage.message_type === "system" || lastMessage.message_type === "auto_response",
      }
    }
    return null
  }

  const getUnreadCount = (conversation: Conversation) => {
    // This would need to be implemented with proper unread message tracking
    return 0
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <Card className="text-center p-8">
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground">
          {isCustomer
            ? "Start chatting with shops to see your conversations here"
            : "Customer conversations will appear here"}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {conversations.map((conversation, index) => {
        const lastMessage = getLastMessage(conversation)
        const unreadCount = getUnreadCount(conversation)

        return (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/chat/${conversation.id}`}>
              <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={isCustomer ? conversation.shop.image_url : undefined}
                        alt={isCustomer ? conversation.shop.name : conversation.customer.full_name}
                      />
                      <AvatarFallback>
                        {isCustomer ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {isCustomer ? conversation.shop.name : conversation.customer.full_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {lastMessage.isSystem && <span className="text-blue-600 font-medium">Auto: </span>}
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
