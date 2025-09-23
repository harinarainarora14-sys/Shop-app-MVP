"use client"

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Send, ArrowLeft, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

interface Message {
  id: string
  content: string
  is_read: boolean
  created_at: string
  sender: {
    id: string
    full_name: string
  }
}

interface QuickReply {
  id: string
  content: string
}

interface Conversation {
  id: string
  messages: Message[]
  shop: {
    id: string
    name: string
    image_url: string
    is_open: boolean
    quick_replies: QuickReply[]
  }
  customer: {
    id: string
    full_name: string
  }
}

interface ChatViewProps {
  conversation: Conversation
  currentUserId: string
  isCustomer: boolean
}

export function ChatView({ conversation, currentUserId, isCustomer }: ChatViewProps) {
  const [messages, setMessages] = useState(conversation.messages)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [unansweredTime, setUnansweredTime] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  const quickReplies = useMemo(() => [
    { id: 'open', content: 'Are you open right now?' },
    { id: 'stock', content: 'Is this item available?' },
    { id: 'price', content: 'What\'s the price?' }
  ], [])

  const shopResponses = useMemo(() => [
    { id: 'in-stock', content: 'Yes, it\'s available in stock!' },
    { id: 'out-stock', content: 'Sorry, currently out of stock.' },
    { id: 'busy', content: 'We\'re a bit busy, will check and get back to you soon.' }
  ], [])

  useEffect(() => {
    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, 
      payload => {
        const newMessage = payload.new as Message
        setMessages(prev => [...prev, newMessage])
        
        // Reset unanswered timer when receiving a message
        if (newMessage.sender.id !== currentUserId) {
          setUnansweredTime(null)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation.id, currentUserId])

  // Auto-response timer
  useEffect(() => {
    if (!isCustomer || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.sender.id === currentUserId) {
      setUnansweredTime(Date.now())
      const timer = setTimeout(() => {
        sendMessage("Our shop will get back to you soon. Meanwhile, you can check our inventory for updates.", true)
      }, 120000) // 2 minutes

      return () => clearTimeout(timer)
    }
  }, [messages, isCustomer, currentUserId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string, isAutoResponse = false) => {
    if (!content.trim()) return

    setIsTyping(true)
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          content: content.trim(),
          is_read: false,
          is_auto_response: isAutoResponse
        })
        .select('*, sender:sender_id(id, full_name)')
        .single()

      if (error) throw error

      setMessages(prev => [...prev, message])
      setNewMessage('')
      
      // Reset unanswered time when sending a message
      setUnansweredTime(null)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setIsTyping(false)
    }
  }

  const markAsAnswered = async (response: string) => {
    const lastCustomerMessage = [...messages].reverse()
      .find(m => m.sender.id !== currentUserId)
    
    if (lastCustomerMessage) {
      // Mark the message as answered
      await supabase
        .from('messages')
        .update({ is_answered: true })
        .eq('id', lastCustomerMessage.id)

      // Send the response
      await sendMessage(response)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(newMessage)
  }

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5" />
            <div>
              <h2 className="font-semibold">{isCustomer ? conversation.shop.name : conversation.customer.full_name}</h2>
              {isCustomer && (
                <Badge variant={conversation.shop.is_open ? "default" : "secondary"}>
                  {conversation.shop.is_open ? "Open" : "Closed"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Messages */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto p-4">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${message.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={cn(
                          "max-w-[70%] px-4 py-2 rounded-lg relative",
                          message.sender.id === currentUserId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                          message.is_auto_response && "border border-dashed border-muted-foreground/30"
                        )}
                      >
                        <p className="break-words">{message.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs opacity-70">
                            {format(new Date(message.created_at), 'p')}
                          </p>
                          {message.sender.id !== currentUserId && !message.is_read && (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              Unread
                            </Badge>
                          )}
                          {message.is_answered && (
                            <Badge variant="default" className="text-[10px] py-0 bg-green-500">
                              Answered
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Area */}
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isTyping}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim() || isTyping}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {/* Quick Replies for Customers */}
                {isCustomer && (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <Button
                        key={reply.id}
                        variant="secondary"
                        size="sm"
                        onClick={() => sendMessage(reply.content)}
                        disabled={isTyping}
                        className="text-xs"
                      >
                        {reply.content}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Quick Responses for Shop Owners */}
                {!isCustomer && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Quick Responses:</span>
                      {shopResponses.map((response) => (
                        <Button
                          key={response.id}
                          variant="outline"
                          size="sm"
                          onClick={() => markAsAnswered(response.content)}
                          disabled={isTyping}
                          className="text-xs"
                        >
                          {response.content}
                        </Button>
                      ))}
                    </div>
                    {conversation.shop.quick_replies?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {conversation.shop.quick_replies.map((reply) => (
                          <Button
                            key={reply.id}
                            variant="secondary"
                            size="sm"
                            onClick={() => sendMessage(reply.content)}
                            disabled={isTyping}
                            className="text-xs"
                          >
                            {reply.content}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}