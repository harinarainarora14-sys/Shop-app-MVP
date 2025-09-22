import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { QRScanner } from "@/components/qr-scanner"

export default async function ScannerPage() {
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

  return <QRScanner user={user} />
}
