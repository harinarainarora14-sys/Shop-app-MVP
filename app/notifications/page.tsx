import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsList } from "@/components/notifications-list"

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select(`
      *,
      shops (name, address),
      products (name, price)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return <NotificationsList notifications={notifications || []} userId={user.id} />
}
