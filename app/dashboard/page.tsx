import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CustomerDashboard } from "@/components/customer-dashboard"
import { ShopkeeperDashboard } from "@/components/shopkeeper-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to determine dashboard type
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  if (profile.user_type === "shopkeeper") {
    return <ShopkeeperDashboard user={user} profile={profile} />
  } else {
    return <CustomerDashboard user={user} profile={profile} />
  }
}
