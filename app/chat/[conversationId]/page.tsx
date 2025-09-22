import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ChatPageProps {
  params: {
    conversationId: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookies().getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookies().set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get conversation details
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      customer:profiles!conversations_customer_id_fkey(full_name, email),
      shop:shops(name, image_url, owner_id)
    `,
    )
    .eq("id", params.conversationId)
    .single()

  if (error || !conversation) {
    notFound()
  }

  // Check if user has access to this conversation
  const hasAccess =
    conversation.customer_id === user.id || // User is the customer
    conversation.shop.owner_id === user.id // User is the shop owner

  if (!hasAccess) {
    redirect("/chat")
  }

  const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", user.id).single()

  const isCustomer = profile?.user_type === "customer"

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/chat">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to conversations
          </Button>
        </Link>
      </div>

      <ChatInterface
        conversationId={params.conversationId}
        shopId={conversation.shop_id}
        shopName={conversation.shop.name}
        shopImage={conversation.shop.image_url}
        currentUserId={user.id}
        isCustomer={isCustomer}
      />
    </div>
  )
}
