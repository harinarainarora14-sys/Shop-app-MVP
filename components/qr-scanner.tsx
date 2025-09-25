"use client"

import type React from "react"
import { Store } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { QRScannerVideo } from "./qr-scanner-video"

interface User {
  id: string
  email: string
}

export function QRScanner({ user }: { user: User }) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [shopId, setShopId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleScan = async (result: string) => {
    try {
      // Stop scanning after successful scan
      setIsScanning(false)

      // Expected QR format: shopId|amount|description
      const [scannedShopId, scannedAmount, scannedDescription] = result.split("|")
      
      if (!scannedShopId || !scannedAmount) {
        throw new Error("Invalid QR code format")
      }

      // Get detailed shop information
      const { data: shop } = await supabase
        .from("shops")
        .select(`
          id,
          name,
          description,
          address,
          phone,
          is_open,
          image_url
        `)
        .eq("id", scannedShopId)
        .single()

      if (!shop) {
        throw new Error("Shop not found")
      }

      // Set form values from scan
      setShopId(scannedShopId)
      setAmount(scannedAmount)
      if (scannedDescription) {
        setDescription(scannedDescription)
      }

      // Show shop profile card
      toast({
        title: (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">{shop.name}</div>
              <div className="text-sm text-muted-foreground">{shop.address}</div>
            </div>
          </div>
        ),
        description: (
          <div className="mt-2 space-y-2">
            <Badge variant={shop.is_open ? "default" : "secondary"} className="text-xs">
              {shop.is_open ? "Open Now" : "Closed"}
            </Badge>
            <p className="text-sm">{shop.description}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={() => router.push(`/shop/${shop.id}`)}
            >
              View Shop Details
            </Button>
          </div>
        ),
      })
    } catch (error) {
      toast({
        title: "Invalid QR Code",
        description: "Please try scanning again or use manual entry",
        variant: "destructive",
      })
    }
  }

  const handleScanError = (error: string) => {
    toast({
      title: "Scanner Error",
      description: error,
      variant: "destructive",
    })
    setIsScanning(false)
  }

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
      <Card className="mx-auto max-w-sm">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </div>
            <CardDescription>Scan shop QR codes to automatically log purchases</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isScanning ? (
            <div className="flex flex-col items-center gap-4">
              <QRScannerVideo onScan={handleScan} onError={handleScanError} />
              <Button variant="outline" onClick={() => setIsScanning(false)}>
                Cancel Scan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <Button className="w-full" onClick={() => setIsScanning(true)}>
                <QrCode className="h-5 w-5 mr-2" />
                Start Camera Scan
              </Button>
              <p className="text-sm text-muted-foreground">
                Position the QR code within the frame to scan
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-sm mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Manual Entry
          </CardTitle>
          <CardDescription>Enter purchase details manually</CardDescription>
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
