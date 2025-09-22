"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { QrCode, ArrowLeft, DollarSign, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
}

export function QRScanner({ user }: { user: User }) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [shopId, setShopId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !shopId) return

    setIsLoading(true)

    try {
      // Verify shop exists
      const { data: shop } = await supabase.from("shops").select("name").eq("id", shopId).single()

      if (!shop) {
        toast({
          title: "Shop Not Found",
          description: "Please check the shop ID and try again",
          variant: "destructive",
        })
        return
      }

      // Record purchase
      const { error } = await supabase.from("purchase_journal").insert({
        user_id: user.id,
        shop_id: shopId,
        amount: Number.parseFloat(amount),
        description: description || null,
      })

      if (error) throw error

      toast({
        title: "Purchase Recorded",
        description: `$${amount} purchase at ${shop.name} has been logged`,
      })

      // Reset form
      setAmount("")
      setDescription("")
      setShopId("")
    } catch (error) {
      console.error("Error recording purchase:", error)
      toast({
        title: "Error",
        description: "Failed to record purchase",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="ml-4">
            <h1 className="font-semibold">Purchase Scanner</h1>
            <p className="text-sm text-muted-foreground">Track your local shopping</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* QR Scanner Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>Scan shop QR codes to automatically log purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">QR Scanner Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Camera-based QR scanning will be available in a future update
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Manual Entry
            </CardTitle>
            <CardDescription>Manually log your purchases for now</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="shop-id">Shop ID</Label>
                <Input
                  id="shop-id"
                  placeholder="Enter shop ID (ask the shopkeeper)"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can find the shop ID by asking the shopkeeper or checking their display
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Purchase Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What did you buy?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Recording..." : "Record Purchase"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
