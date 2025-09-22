"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Users, Package, TrendingUp, AlertCircle } from "lucide-react"

interface BackInStockRequest {
  id: string
  user_id: string
  product_id: string
  created_at: string
  profiles: {
    full_name: string
    email: string
  }
  products: {
    name: string
    price: number
    stock_quantity: number
  }
}

interface BackInStockInsightsProps {
  shopId: string
}

export function BackInStockInsights({ shopId }: BackInStockInsightsProps) {
  const [requests, setRequests] = useState<BackInStockRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadBackInStockRequests()
  }, [shopId])

  const loadBackInStockRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("back_in_stock_requests")
        .select(`
          *,
          profiles (full_name, email),
          products (name, price, stock_quantity)
        `)
        .in("product_id", supabase.from("products").select("id").eq("shop_id", shopId))
        .order("created_at", { ascending: false })

      if (error) throw error

      setRequests(data || [])
    } catch (error) {
      console.error("Error loading back-in-stock requests:", error)
      toast({
        title: "Error",
        description: "Failed to load back-in-stock requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRequestsByProduct = () => {
    const productMap = new Map()

    requests.forEach((request) => {
      const productId = request.product_id
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product: request.products,
          requests: [],
        })
      }
      productMap.get(productId).requests.push(request)
    })

    return Array.from(productMap.values()).sort((a, b) => b.requests.length - a.requests.length)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString()
  }

  const productRequests = getRequestsByProduct()
  const totalRequests = requests.length
  const uniqueCustomers = new Set(requests.map((r) => r.user_id)).size

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">Total Requests</CardTitle>
              <motion.div
                whileHover={{ rotate: 5 }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100"
              >
                <Bell className="h-5 w-5 text-blue-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalRequests}</div>
              <p className="text-base text-muted-foreground mt-1">Active notifications</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">Waiting Customers</CardTitle>
              <motion.div
                whileHover={{ rotate: 5 }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100"
              >
                <Users className="h-5 w-5 text-green-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{uniqueCustomers}</div>
              <p className="text-base text-muted-foreground mt-1">Unique customers</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -2 }}>
          <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">Most Wanted</CardTitle>
              <motion.div
                whileHover={{ rotate: 5 }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100"
              >
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {productRequests.length > 0 ? productRequests[0].requests.length : 0}
              </div>
              <p className="text-base text-muted-foreground mt-1">
                {productRequests.length > 0 ? productRequests[0].product.name.slice(0, 20) + "..." : "No requests"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Requests */}
      <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Package className="h-6 w-6" />
            Back-in-Stock Requests
          </CardTitle>
          <CardDescription className="text-base">Customers waiting for these products to be restocked</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {productRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mx-auto mb-6">
                  <Bell className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Requests Yet</h3>
                <p className="text-base text-muted-foreground">
                  When customers request notifications for out-of-stock items, they'll appear here
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {productRequests.map((item, index) => (
                  <motion.div
                    key={item.product.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-2xl p-6 bg-background/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">{item.product.name}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-primary">${item.product.price}</span>
                          <Badge
                            variant={item.product.stock_quantity > 0 ? "default" : "destructive"}
                            className="rounded-xl px-3 py-1"
                          >
                            {item.product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-semibold text-foreground">{item.requests.length} waiting</span>
                        </div>
                        {item.product.stock_quantity === 0 && (
                          <Badge variant="outline" className="rounded-xl">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Priority Restock
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground">Waiting Customers:</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {item.requests.slice(0, 6).map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                          >
                            <div>
                              <p className="font-medium text-foreground">{request.profiles.full_name}</p>
                              <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">{formatDate(request.created_at)}</p>
                            </div>
                          </div>
                        ))}
                        {item.requests.length > 6 && (
                          <div className="flex items-center justify-center p-3 bg-muted/20 rounded-xl border-2 border-dashed">
                            <p className="text-sm text-muted-foreground">+{item.requests.length - 6} more customers</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.product.stock_quantity === 0 && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          <h4 className="font-medium text-orange-900">Restock Recommendation</h4>
                        </div>
                        <p className="text-sm text-orange-700">
                          {item.requests.length} customers are waiting for this item. Restocking will automatically
                          notify all waiting customers.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
