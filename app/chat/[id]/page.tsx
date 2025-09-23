import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChatView } from '@/components/chat-view'

interface PageProps {
  params: {
    id: string
  }
}

export default async function ChatPage({ params: { id } }: PageProps) {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get conversation with messages and participants
  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (
        id,
        content,
        is_read,
        created_at,
        sender:sender_id (id, full_name)
      ),
      shop:shop_id (
        id,
        name,
        image_url,
        is_open,
        owner:owner_id (id),
        quick_replies (
          id,
          content
        )
      ),
      customer:customer_id (
        id,
        full_name
      )
    `)
    .eq('id', id)
    .single()

  if (!conversation) {
    redirect('/dashboard')
  }

  // Check user has permission to view
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  const isCustomer = profile?.user_type === 'customer'
  const canView = isCustomer 
    ? conversation.customer_id === user.id
    : conversation.shop.owner.id === user.id

  if (!canView) {
    redirect('/dashboard')
  }

  // Mark messages as read
  if (isCustomer) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
  }

  return (
    <ChatView
      conversation={conversation}
      currentUserId={user.id}
      isCustomer={isCustomer}
    />
  )
}