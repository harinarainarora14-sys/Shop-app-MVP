import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
 
export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get user profile to determine if they're a customer or shop owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const isCustomer = profile?.user_type === 'customer'

    // Get conversations with nested messages and shop/customer details
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          content,
          is_read,
          created_at,
          sender: sender_id (id)
        ),
        shop:shop_id (
          id,
          name,
          image_url,
          is_open,
          owner:owner_id (id)
        ),
        customer:customer_id (
          id,
          full_name
        )
      `)
      .order('last_message_at', { ascending: false })
      .or(
        isCustomer
          ? `customer_id.eq.${user.id}`  // For customers
          : `shop_id.in.(${                // For shop owners
              supabase.from('shops')
                .select('id')
                .eq('owner_id', user.id)
                .toString()
            })`
      )

    if (error) {
      throw error
    }

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}