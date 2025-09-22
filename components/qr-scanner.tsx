"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  QrCode,
  ArrowLeft,
  DollarSign,
  Receipt,
  Store,
  MapPin,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

interface User {
  id: string
  email: string
}

interface Shop {
  id: string
  name: string
  description: string
  address: string
  phone: string
  is_open: boolean
  image_url?: string
}

export function QRScanner({ user }: { user: User }) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [shopId, setShopId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [scanMode, setScanMode] = useState<"qr" | "manual" | "fallback">("qr")
  const [scannedShop, setScannedShop] = useState<Shop | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (shopId && shopId.length >= 8) {
      // Minimum shop ID length
      lookupShop(shopId)
    } else {
      setScannedShop(null)
      setScanError(null)
    }
  }, [shopId])

  const lookupShop = async (id: string) => {
    try {
      const { data: shop, error } = await supabase.from("shops").select("*").eq("id", id).single()

      if (error || !shop) {
        setScanError("Shop not found. Please check the ID and try again.")
        setScannedShop(null)
        return
      }

      setScannedShop(shop)
      setScanError(null)
    } catch (error) {
      console.error("Error looking up shop:", error)
      setScanError("Failed to lookup shop. Please try again.")
      setScannedShop(null)
    }
  }

  const simulateQRScan = async () => {
    setIsLoading(true)

    // Simulate scan attempt
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate failure and switch to fallback
    setScanError("QR scan failed. Camera not accessible or QR code unclear.")
    setScanMode("fallback")
    setIsLoading(false)

    toast({
      title: "Scan Failed",
      description: "Switched to manual entry mode",
      variant: "destructive",
    })
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !shopId || !scannedShop) return

    setIsLoading(true)

    try {
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
        description: `$${amount} purchase at ${scannedShop.name} has been logged`,
      })

      // Reset form
      setAmount("")
      setDescription("")
      setShopId("")
      setScannedShop(null)
      setScanMode("qr")
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card/80 backdrop-blur-xl shadow-sm"
      >
        <div className="flex h-20 items-center px-6">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </motion.div>
          <div className="ml-4">
            <h1 className="text-xl font-bold text-foreground">Purchase Scanner</h1>
            <p className="text-base text-muted-foreground">Track your local shopping</p>
          </div>
        </div>
      </motion.div>

      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        {/* QR Scanner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <motion.div
                  whileHover={{ rotate: 5 }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10"
                >
                  <QrCode className="h-6 w-6 text-primary" />
                </motion.div>
                QR Code Scanner
              </CardTitle>
              <CardDescription className="text-base">Scan shop QR codes to automatically log purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {scanMode === "qr" && (
                  <motion.div
                    key="qr-scanner"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-16 border-2 border-dashed border-primary/25 rounded-2xl bg-primary/5"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <QrCode className="h-20 w-20 text-primary mx-auto mb-6" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Scan</h3>
                    <p className="text-base text-muted-foreground mb-6">Point your camera at the shop's QR code</p>
                    <div className="flex gap-4 justify-center">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={simulateQRScan}
                          disabled={isLoading}
                          className="rounded-2xl px-6 py-3 text-base"
                        >
                          {isLoading ? "Scanning..." : "Start Scan"}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="outline"
                          onClick={() => setScanMode("manual")}
                          className="rounded-2xl px-6 py-3 text-base border-2"
                        >
                          Manual Entry
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {scanMode === "fallback" && (
                  <motion.div
                    key="fallback"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">Scan Failed</p>
                        <p className="text-sm text-orange-700">{scanError}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Fallback Mode</h3>
                      <p className="text-base text-muted-foreground mb-4">Enter the shop ID manually to continue</p>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="outline" onClick={() => setScanMode("qr")} className="rounded-2xl border-2">
                          Try Scan Again
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Shop Profile Card */}
        <AnimatePresence>
          {scannedShop && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              <Card className="rounded-2xl border-0 shadow-xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20"
                    >
                      <Store className="h-8 w-8 text-primary" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-foreground">{scannedShop.name}</h3>
                        <Badge
                          variant={scannedShop.is_open ? "default" : "secondary"}
                          className="rounded-xl px-3 py-1 text-sm"
                        >
                          {scannedShop.is_open ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground text-pretty mb-3">{scannedShop.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{scannedShop.address}</span>
                        </div>
                        {scannedShop.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{scannedShop.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span className={scannedShop.is_open ? "text-green-600" : "text-red-600"}>
                            Currently {scannedShop.is_open ? "Open" : "Closed"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Entry Form */}
        <AnimatePresence>
          {(scanMode === "manual" || scanMode === "fallback") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <motion.div
                      whileHover={{ rotate: 5 }}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100"
                    >
                      <Receipt className="h-6 w-6 text-blue-600" />
                    </motion.div>
                    Manual Entry
                  </CardTitle>
                  <CardDescription className="text-base">
                    {scanMode === "fallback" ? "Complete your purchase entry" : "Manually log your purchases"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualEntry} className="space-y-6">
                    <div className="grid gap-3">
                      <Label htmlFor="shop-id" className="text-base font-medium">
                        Shop ID
                      </Label>
                      <Input
                        id="shop-id"
                        placeholder="Enter shop ID (ask the shopkeeper)"
                        value={shopId}
                        onChange={(e) => setShopId(e.target.value)}
                        required
                        className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        {scanError ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{scanError}</span>
                          </div>
                        ) : scannedShop ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Shop found: {scannedShop.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            You can find the shop ID by asking the shopkeeper
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="amount" className="text-base font-medium">
                        Purchase Amount
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-12 h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Label htmlFor="description" className="text-base font-medium">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="What did you buy?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-24 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                      />
                    </div>

                    <div className="flex gap-4">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                        <Button
                          type="submit"
                          className="w-full h-12 text-base font-medium rounded-2xl"
                          disabled={isLoading || !scannedShop}
                        >
                          {isLoading ? "Recording..." : "Record Purchase"}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setScanMode("qr")
                            setShopId("")
                            setScannedShop(null)
                            setScanError(null)
                          }}
                          className="h-12 px-6 text-base rounded-2xl border-2"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branded QR Frame Generator */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground">For Shopkeepers</CardTitle>
              <CardDescription className="text-base">Generate branded QR codes for your shop</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-2xl bg-muted/10">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">QR Code Generator</h3>
                <p className="text-base text-muted-foreground mb-4">Create custom QR codes with your shop branding</p>
                <Badge variant="outline" className="rounded-xl px-4 py-2 text-base">
                  Coming Soon
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
