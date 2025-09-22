import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ShopDetails } from "@/components/shop-details"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ShopPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get shop details
  const { data: shop } = await supabase.from("shops").select("*").eq("id", id).single()

  if (!shop) {
    redirect("/dashboard")
  }

  // Get shop products
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      categories (name)
    `)
    .eq("shop_id", id)
    .eq("is_available", true)
    .order("name")

  return <ShopDetails shop={shop} products={products || []} user={user} />
}
