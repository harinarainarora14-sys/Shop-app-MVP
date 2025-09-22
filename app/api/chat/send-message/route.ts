import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { generateAutoResponse, sendFallbackResponse } from "@/lib/chat/auto-response"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content, shopId } = await request.json()

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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Send the user's message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: "text",
      })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Update conversation last_message_at
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId)

    // Try to generate auto-response
    const autoResponse = await generateAutoResponse(content, shopId)

    if (autoResponse.shouldRespond && autoResponse.response) {
      // Send auto-response immediately
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: null, // System/auto response
        content: autoResponse.response,
        message_type: "auto_response",
      })
    } else {
      // Schedule fallback response after 2 minutes
      setTimeout(
        async () => {
          await sendFallbackResponse(conversationId)
        },
        2 * 60 * 1000,
      ) // 2 minutes
    }

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
