"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, MessageCircle, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createBrowserClient } from "@supabase/ssr"
import { formatDistanceToNow } from "date-fns"
import { QuickReplies } from "./quick-replies"

interface Message {
  id: string
  content: string
  sender_id: string | null
  message_type: "text" | "quick_reply" | "auto_response" | "system"
  created_at: string
  is_read: boolean
}

interface ChatInterfaceProps {
  conversationId: string
  shopId: string
  shopName: string
  shopImage?: string
  currentUserId: string
  isCustomer: boolean
}

export function ChatInterface({
  conversationId,
  shopId,
  shopName,
  shopImage,
  currentUserId,
  isCustomer,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load messages
  useEffect(() => {
    loadMessages()

    // Set up real-time subscription
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])

          // Show typing indicator for auto responses
          if (newMessage.message_type === "auto_response") {
            setIsTyping(true)
            setTimeout(() => setIsTyping(false), 1000)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (data && !error) {
      setMessages(data)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)
    setNewMessage("")

    try {
      const response = await fetch("/api/chat/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
          shopId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      // Show typing indicator briefly
      setIsTyping(true)
      setTimeout(() => setIsTyping(false), 2000)
    } catch (error) {
      console.error("Error sending message:", error)
      setNewMessage(newMessage) // Restore message on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleQuickReply = (message: string) => {
    setNewMessage(message)
    // Auto-send the quick reply
    setTimeout(() => {
      sendMessage()
    }, 100)
  }

  const getMessageAlignment = (message: Message) => {
    if (message.message_type === "system") return "center"
    if (message.sender_id === currentUserId) return "right"
    return "left"
  }

  const getMessageStyle = (message: Message) => {
    if (message.message_type === "system") {
      return "bg-muted text-muted-foreground text-sm"
    }
    if (message.sender_id === currentUserId) {
      return "bg-primary text-primary-foreground ml-auto"
    }
    if (message.message_type === "auto_response") {
      return "bg-blue-50 text-blue-900 border border-blue-200"
    }
    return "bg-muted text-foreground"
  }

  return (
    <Card className="flex flex-col h-[700px] max-w-2xl mx-auto">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/50">
        <Avatar className="h-10 w-10">
          <AvatarImage src={shopImage || "/placeholder.svg"} alt={shopName} />
          <AvatarFallback>{shopName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{shopName}</h3>
          <p className="text-sm text-muted-foreground">{isCustomer ? "Chat with shop owner" : "Customer support"}</p>
        </div>
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Quick Replies */}
      <div className="p-4 border-b bg-background/30">
        <QuickReplies
          shopId={shopId}
          onQuickReply={handleQuickReply}
          isCustomer={isCustomer}
          conversationId={conversationId}
        />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${
                getMessageAlignment(message) === "center"
                  ? "justify-center"
                  : getMessageAlignment(message) === "right"
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${getMessageStyle(message)} ${
                  message.message_type === "system" ? "text-center px-3 py-1" : ""
                }`}
              >
                <p className="text-base leading-relaxed">{message.content}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs opacity-70">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                  {message.sender_id === currentUserId && <CheckCircle2 className="h-3 w-3 opacity-70" />}
                  {message.message_type === "auto_response" && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Auto</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm">Typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-background/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-2xl"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim() || isLoading} size="icon" className="rounded-2xl">
            {isLoading ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  )
}
