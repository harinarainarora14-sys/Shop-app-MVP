import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PurchaseHistory } from "@/components/purchase-history"

export default async function PurchasesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.user_type !== "customer") {
    redirect("/dashboard")
  }

  // Get purchase history
  const { data: purchases } = await supabase
    .from("purchase_journal")
    .select(`
      *,
      shops (name, address)
    `)
    .eq("user_id", user.id)
    .order("purchase_date", { ascending: false })

  return <PurchaseHistory purchases={purchases || []} />
}
