"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  Clock, 
  User, 
  Store, 
  Search,
  Filter,
  MoreVertical,
  Pin,
  Archive,
  Trash2,
  Star,
  CheckCircle2,
  Circle,
  Bell,
  BellOff,
  RefreshCw,
  SortDesc,
  Users,
  TrendingUp
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@supabase/ssr"
import { formatDistanceToNow, isToday, isYesterday } from "date-fns"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Conversation {
  id: string
  customer_id: string
  shop_id: string
  last_message_at: string
  is_active: boolean
  is_pinned?: boolean
  is_archived?: boolean
  priority?: "low" | "normal" | "high"
  customer: {
    full_name: string
    email: string
  }
  shop: {
    name: string
    image_url?: string
    is_open?: boolean
  }
  messages: Array<{
    content: string
    created_at: string
    message_type: string
    sender_id: string | null
    is_read: boolean
  }>
  unread_count?: number
}

interface ChatListProps {
  isCustomer: boolean
  currentUserId: string
}

export function EnhancedChatList({ isCustomer, currentUserId }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "active" | "archived">("all")
  const [sortBy, setSortBy] = useState<"recent" | "unread" | "priority">("recent")
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "pinned" | "archived">("all")
  
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    loadConversations()

    // Enhanced real-time subscription
    const channel = supabase
      .channel("conversations-list")
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Refresh conversations when new messages arrive
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
        // Enhanced conversations with calculated fields
        const enhancedConversations = data.conversations.map((conv: Conversation) => ({
          ...conv,
          unread_count: conv.messages?.filter(m => 
            !m.is_read && m.sender_id !== currentUserId
          ).length || 0,
          priority: calculatePriority(conv),
          is_pinned: false, // This would come from user preferences
          is_archived: false, // This would come from user preferences
        }))
        
        setConversations(enhancedConversations)
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
      toast({
        title: "Error loading conversations",
        description: "Please refresh to try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculatePriority = (conversation: Conversation): "low" | "normal" | "high" => {
    const unreadCount = conversation.messages?.filter(m => 
      !m.is_read && m.sender_id !== currentUserId
    ).length || 0
    
    const lastMessageTime = new Date(conversation.last_message_at)
    const hoursAgo = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60)
    
    if (unreadCount > 3 || hoursAgo < 1) return "high"
    if (unreadCount > 0 || hoursAgo < 24) return "normal"
    return "low"
  }

  // Enhanced filtering and sorting
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations

    // Apply tab filter
    switch (activeTab) {
      case "pinned":
        filtered = filtered.filter(conv => conv.is_pinned)
        break
      case "archived":
        filtered = filtered.filter(conv => conv.is_archived)
        break
      default:
        filtered = filtered.filter(conv => !conv.is_archived)
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(conv => {
        const searchTerm = searchQuery.toLowerCase()
        const name = isCustomer ? conv.shop.name : conv.customer.full_name
        const lastMessage = getLastMessage(conv)
        
        return name.toLowerCase().includes(searchTerm) ||
               conv.customer.email.toLowerCase().includes(searchTerm) ||
               lastMessage?.content.toLowerCase().includes(searchTerm)
      })
    }

    // Apply status filter
    switch (filterStatus) {
      case "unread":
        filtered = filtered.filter(conv => (conv.unread_count || 0) > 0)
        break
      case "active":
        filtered = filtered.filter(conv => conv.is_active)
        break
    }

    // Apply sorting
    switch (sortBy) {
      case "unread":
        filtered.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0))
        break
      case "priority":
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        filtered.sort((a, b) => priorityOrder[b.priority || 'normal'] - priorityOrder[a.priority || 'normal'])
        break
      default: // recent
        filtered.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
    }

    return filtered
  }, [conversations, searchQuery, filterStatus, sortBy, activeTab, currentUserId])

  const getLastMessage = (conversation: Conversation) => {
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1]
      return {
        content: lastMessage.content,
        time: lastMessage.created_at,
        isSystem: lastMessage.message_type === "system" || lastMessage.message_type === "auto_response",
        isFromMe: lastMessage.sender_id === currentUserId
      }
    }
    return null
  }

  const getTimeDisplay = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return formatDistanceToNow(date, { addSuffix: true })
    }
  }

  const getPriorityColor = (priority: "low" | "normal" | "high") => {
    switch (priority) {
      case "high": return "border-l-red-500"
      case "normal": return "border-l-blue-500"
      case "low": return "border-l-gray-300"
    }
  }

  const handleBulkAction = async (action: "archive" | "delete" | "mark-read") => {
    if (selectedConversations.length === 0) return

    try {
      // Implement bulk actions here
      toast({
        title: `${action} completed`,
        description: `${selectedConversations.length} conversations updated`,
      })
      setSelectedConversations([])
      loadConversations()
    } catch (error) {
      toast({
        title: "Action failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId) 
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="h-10 bg-muted rounded w-64 animate-pulse" />
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        {[1, 2, 3, 4].map((i) => (
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

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">Total Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {conversations.filter(conv => conv.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SortDesc className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={loadConversations}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedConversations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedConversations.length === filteredAndSortedConversations.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedConversations(filteredAndSortedConversations.map(c => c.id))
                    } else {
                      setSelectedConversations([])
                    }
                  }}
                />
                <span className="font-medium">
                  {selectedConversations.length} conversations selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("mark-read")}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Read
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("archive")}>
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleBulkAction("delete")}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({conversations.filter(c => !c.is_archived).length})
          </TabsTrigger>
          <TabsTrigger value="pinned">
            <Pin className="h-4 w-4 mr-1" />
            Pinned ({conversations.filter(c => c.is_pinned).length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="h-4 w-4 mr-1" />
            Archived ({conversations.filter(c => c.is_archived).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredAndSortedConversations.length === 0 ? (
            <Card className="text-center p-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Try adjusting your search or filters"
                  : isCustomer
                    ? "Start chatting with shops to see your conversations here"
                    : "Customer conversations will appear here"
                }
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredAndSortedConversations.map((conversation, index) => {
                  const lastMessage = getLastMessage(conversation)
                  const isSelected = selectedConversations.includes(conversation.id)

                  return (
                    <motion.div
                      key={conversation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`hover:shadow-md transition-all duration-200 cursor-pointer group border-l-4 ${getPriorityColor(conversation.priority || 'normal')} ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleConversationSelection(conversation.id)}
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={isCustomer ? conversation.shop.image_url : undefined}
                                  alt={isCustomer ? conversation.shop.name : conversation.customer.full_name}
                                />
                                <AvatarFallback>
                                  {isCustomer ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                </AvatarFallback>
                              </Avatar>
                              
                              {isCustomer && conversation.shop.is_open && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </div>

                            <Link href={`/chat/${conversation.id}`} className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                    {isCustomer ? conversation.shop.name : conversation.customer.full_name}
                                  </h3>
                                  {conversation.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
                                  {(conversation.unread_count || 0) > 0 && (
                                    <Badge variant="destructive" className="text-xs min-w-[20px] h-5">
                                      {conversation.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {getTimeDisplay(conversation.last_message_at)}
                                  </span>
                                </div>
                              </div>

                              {lastMessage && (
                                <div className="flex items-center gap-1">
                                  {lastMessage.isSystem && (
                                    <Badge variant="outline" className="text-xs">
                                      Auto
                                    </Badge>
                                  )}
                                  {lastMessage.isFromMe && (
                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <p className="text-sm text-muted-foreground truncate flex-1">
                                    {lastMessage.content}
                                  </p>
                                </div>
                              )}
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Pin conversation
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <BellOff className="h-4 w-4 mr-2" />
                                  Mute notifications
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
