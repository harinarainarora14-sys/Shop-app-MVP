"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Store, Package, Search, Bell, LogOut, MapPin, Phone, QrCode, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Profile {
  id: string
  email: string
  full_name: string
  user_type: string
}

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
  image_url: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  is_available: boolean
  shop_id: string
  shops?: Shop
  categories?: { name: string }
}

export function CustomerDashboard({ user, profile }: { user: User; profile: Profile }) {
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    loadNotificationCount()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load open shops
      const { data: shopsData } = await supabase.from("shops").select("*").eq("is_open", true).order("name")

      setShops(shopsData || [])

      // Load available products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          shops (name, address, phone, is_open),
          categories (name)
        `)
        .eq("is_available", true)
        .gt("stock_quantity", 0)
        .order("name")

      setProducts(productsData || [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadNotificationCount = async () => {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      setUnreadNotifications(count || 0)
    } catch (error) {
      console.error("Error loading notification count:", error)
    }
  }

  const handleRequestNotification = async (productId: string) => {
    try {
      const { error } = await supabase.from("back_in_stock_requests").insert({
        user_id: user.id,
        product_id: productId,
      })

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          toast({
            title: "Already Requested",
            description: "You're already subscribed to notifications for this product",
          })
          return
        }
        throw error
      }

      toast({
        title: "Notification Requested",
        description: "You'll be notified when this item is back in stock",
      })
    } catch (error) {
      console.error("Error requesting notification:", error)
      toast({
        title: "Error",
        description: "Failed to request notification",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.shops?.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-4">
            <Store className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">ShopConnect</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile.full_name}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications" className="relative">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/scanner">
                <QrCode className="h-4 w-4 mr-2" />
                Scanner
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchases">
                <Receipt className="h-4 w-4 mr-2" />
                Purchases
              </Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search shops and products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList>
            <TabsTrigger value="shops">Local Shops</TabsTrigger>
            <TabsTrigger value="products">Available Products</TabsTrigger>
          </TabsList>

          <TabsContent value="shops" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Open Shops Near You</h2>
              {filteredShops.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No open shops found</p>
                    <p className="text-sm text-muted-foreground">Check back later or try a different search</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredShops.map((shop) => (
                    <Card key={shop.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{shop.name}</CardTitle>
                            <Badge className="mt-2">Open</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {shop.description && <p className="text-sm text-muted-foreground">{shop.description}</p>}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{shop.address}</span>
                          </div>
                          {shop.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{shop.phone}</span>
                            </div>
                          )}
                          <div className="pt-2">
                            <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                              <Link href={`/shop/${shop.id}`}>View Products</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Available Products</h2>
              {filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">Try a different search or check back later</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{product.name}</h3>
                              {product.categories && <Badge variant="outline">{product.categories.name}</Badge>}
                            </div>
                            {product.description && <p className="text-muted-foreground">{product.description}</p>}
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-semibold text-lg text-primary">${product.price}</span>
                              <span className="text-muted-foreground">Stock: {product.stock_quantity}</span>
                              <Badge variant="default">Available</Badge>
                            </div>
                            {product.shops && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Store className="h-4 w-4" />
                                <Link href={`/shop/${product.shop_id}`} className="hover:text-primary">
                                  {product.shops.name}
                                </Link>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleRequestNotification(product.id)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Notify Me
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
