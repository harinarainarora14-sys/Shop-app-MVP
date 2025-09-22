import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface AutoResponseResult {
  shouldRespond: boolean
  response?: string
  responseType?: "hours" | "availability" | "pricing" | "fallback"
}

interface ProductMatch {
  id: string
  name: string
  price: number
  is_available: boolean
  stock_quantity: number
}

export async function generateAutoResponse(message: string, shopId: string): Promise<AutoResponseResult> {
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

  const messageText = message.toLowerCase().trim()

  // Check for shop hours/status queries
  if (containsKeywords(messageText, ["open", "closed", "hours", "timing", "time"])) {
    const { data: shop } = await supabase.from("shops").select("is_open, opening_hours, name").eq("id", shopId).single()

    if (shop) {
      const status = shop.is_open ? "OPEN" : "CLOSED"
      const response = `${shop.name} is currently ${status}. ${
        shop.opening_hours
          ? `Our hours: ${formatOpeningHours(shop.opening_hours)}`
          : "Check our shop details for opening hours."
      }`

      return {
        shouldRespond: true,
        response,
        responseType: "hours",
      }
    }
  }

  // Check for product availability queries
  if (containsKeywords(messageText, ["available", "stock", "have", "in stock", "inventory"])) {
    const productMatch = await findProductInMessage(messageText, shopId, supabase)

    if (productMatch) {
      const availability =
        productMatch.is_available && productMatch.stock_quantity > 0
          ? `Yes, ${productMatch.name} is available! We have ${productMatch.stock_quantity} in stock.`
          : `Sorry, ${productMatch.name} is currently out of stock.`

      return {
        shouldRespond: true,
        response: availability,
        responseType: "availability",
      }
    } else {
      return {
        shouldRespond: true,
        response: "Please specify which item you are looking for, and I can check our current inventory.",
        responseType: "availability",
      }
    }
  }

  // Check for pricing queries
  if (containsKeywords(messageText, ["price", "cost", "how much", "rate", "charges", "expensive"])) {
    const productMatch = await findProductInMessage(messageText, shopId, supabase)

    if (productMatch) {
      return {
        shouldRespond: true,
        response: `${productMatch.name} costs ₹${productMatch.price}${
          productMatch.is_available ? "" : " (currently out of stock)"
        }`,
        responseType: "pricing",
      }
    } else {
      return {
        shouldRespond: true,
        response: "Please specify which item you want to know the price for, and I can help you.",
        responseType: "pricing",
      }
    }
  }

  // No auto-response needed
  return { shouldRespond: false }
}

export async function sendFallbackResponse(conversationId: string): Promise<void> {
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

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: null, // System message
    content: "The shopkeeper will get back to you soon — check our inventory list for updates in the meantime!",
    message_type: "system",
  })
}

// Helper functions
function containsKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

async function findProductInMessage(message: string, shopId: string, supabase: any): Promise<ProductMatch | null> {
  // Get all products for the shop
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, is_available, stock_quantity")
    .eq("shop_id", shopId)

  if (!products) return null

  // Find product mentioned in message
  const messageWords = message.toLowerCase().split(/\s+/)

  for (const product of products) {
    const productWords = product.name.toLowerCase().split(/\s+/)

    // Check if any product words are in the message
    const hasMatch = productWords.some((word) =>
      messageWords.some((msgWord) => msgWord.includes(word) || word.includes(msgWord)),
    )

    if (hasMatch) {
      return product
    }
  }

  return null
}

function formatOpeningHours(hours: any): string {
  if (typeof hours === "string") return hours
  if (typeof hours === "object" && hours !== null) {
    // Assuming hours is stored as JSON object like { "monday": "9AM-6PM", ... }
    const today = new Date().toLocaleLowerCase().substring(0, 3) // mon, tue, etc
    return hours[today] || "Check shop details for hours"
  }
  return "Check shop details for hours"
}
