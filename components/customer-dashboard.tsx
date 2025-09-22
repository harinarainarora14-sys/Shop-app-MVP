"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Store, Package, Search, Bell, LogOut, MapPin, Phone, QrCode, Receipt, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { LanguageSelector } from "./language-selector"
import { useTranslation } from "@/hooks/use-translation"

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
  const { t, language, changeLanguage, formatCurrency, getTimeAgo } = useTranslation()

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="relative mx-auto mb-6"
          >
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"></div>
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl font-semibold text-foreground mb-2"
          >
            Loading your dashboard
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base text-muted-foreground"
          >
            Finding the best local shops for you...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
      >
        <div className="flex h-20 items-center px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20"
            >
              <Store className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ShopConnect</h1>
              <p className="text-base text-muted-foreground">Welcome back, {profile.full_name}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* CHANGE> Added compact language selector */}
            <LanguageSelector currentLanguage={language} onLanguageChange={changeLanguage} compact={true} />

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="relative hover:bg-secondary/80 transition-all duration-200 bg-transparent border-2 rounded-2xl"
              >
                <Link href="/notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline text-base">{t("notifications")}</span>
                  <AnimatePresence>
                    {unreadNotifications > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-2 -right-2"
                      >
                        <Badge
                          variant="destructive"
                          className="h-6 w-6 p-0 text-xs flex items-center justify-center rounded-full"
                        >
                          {unreadNotifications > 9 ? "9+" : unreadNotifications}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:bg-secondary/80 transition-all duration-200 bg-transparent border-2 rounded-2xl"
              >
                <Link href="/scanner">
                  <QrCode className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline text-base">{t("scanner")}</span>
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hover:bg-secondary/80 transition-all duration-200 bg-transparent border-2 rounded-2xl"
              >
                <Link href="/purchases">
                  <Receipt className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline text-base">{t("purchases")}</span>
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground rounded-2xl"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline text-base">{t("signOut")}</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl mx-auto"
        >
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            placeholder={`${t("search")} shops, products, or locations...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-base bg-card/50 backdrop-blur-sm border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 rounded-2xl shadow-sm"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="shops" className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-14 p-1 bg-muted/30 backdrop-blur-sm rounded-2xl border">
              <TabsTrigger
                value="shops"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200"
              >
                <Store className="h-4 w-4 mr-2" />
                {t("localShops")}
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200"
              >
                <Package className="h-4 w-4 mr-2" />
                {t("products")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shops" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center space-y-3"
              >
                <h2 className="text-4xl font-bold text-foreground text-balance">Open Shops Near You</h2>
                <p className="text-muted-foreground text-lg text-pretty">
                  Discover what's available in your neighborhood
                </p>
              </motion.div>

              <AnimatePresence mode="wait">
                {filteredShops.length === 0 ? (
                  <motion.div
                    key="no-shops"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="max-w-md mx-auto"
                  >
                    <Card className="border-dashed border-2 rounded-2xl bg-card/30 backdrop-blur-sm">
                      <CardContent className="text-center py-16">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mx-auto mb-6"
                        >
                          <Store className="h-10 w-10 text-muted-foreground" />
                        </motion.div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">No open shops found</h3>
                        <p className="text-base text-muted-foreground mb-6 text-pretty">
                          {searchQuery ? "Try a different search term" : "Check back later when shops open"}
                        </p>
                        {searchQuery && (
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              onClick={() => setSearchQuery("")}
                              className="rounded-2xl border-2"
                            >
                              Clear Search
                            </Button>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="shops-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
                  >
                    {filteredShops.map((shop, index) => (
                      <motion.div
                        key={shop.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group"
                      >
                        <Card className="h-full hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border-0 shadow-lg bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-3 flex-1">
                                <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors text-balance">
                                  {shop.name}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors rounded-xl px-3 py-1">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {t("openNow")}
                                    </Badge>
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6 pt-0">
                            {shop.description && (
                              <p className="text-base text-muted-foreground leading-relaxed text-pretty">
                                {shop.description}
                              </p>
                            )}
                            <div className="space-y-4">
                              <div className="flex items-start gap-3 text-base text-muted-foreground">
                                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed text-pretty">{shop.address}</span>
                              </div>
                              {shop.phone && (
                                <div className="flex items-center gap-3 text-base text-muted-foreground">
                                  <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                                  <span>{shop.phone}</span>
                                </div>
                              )}
                            </div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="w-full mt-6 bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 rounded-2xl h-12 text-base font-medium"
                              >
                                <Link href={`/shop/${shop.id}`}>
                                  <Package className="h-4 w-4 mr-2" />
                                  {t("viewProducts")}
                                </Link>
                              </Button>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="products" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center space-y-3"
              >
                <h2 className="text-4xl font-bold text-foreground text-balance">Available Products</h2>
                <p className="text-muted-foreground text-lg text-pretty">Fresh inventory from local shops</p>
              </motion.div>

              <AnimatePresence mode="wait">
                {filteredProducts.length === 0 ? (
                  <motion.div
                    key="no-products"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="max-w-md mx-auto"
                  >
                    <Card className="border-dashed border-2 rounded-2xl bg-card/30 backdrop-blur-sm">
                      <CardContent className="text-center py-16">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mx-auto mb-6"
                        >
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </motion.div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">No products found</h3>
                        <p className="text-base text-muted-foreground mb-6 text-pretty">
                          {searchQuery ? "Try a different search term" : "Check back later for new inventory"}
                        </p>
                        {searchQuery && (
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                              variant="outline"
                              onClick={() => setSearchQuery("")}
                              className="rounded-2xl border-2"
                            >
                              Clear Search
                            </Button>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="products-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-6 max-w-5xl mx-auto"
                  >
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className="group"
                      >
                        <Card className="hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 border-0 shadow-lg bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                          <CardContent className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                              <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <h3 className="font-bold text-2xl text-foreground group-hover:text-primary transition-colors text-balance">
                                    {product.name}
                                  </h3>
                                  {product.categories && (
                                    <Badge variant="outline" className="bg-secondary/50 rounded-xl px-3 py-1 text-base">
                                      {product.categories.name}
                                    </Badge>
                                  )}
                                </div>

                                {product.description && (
                                  <p className="text-base text-muted-foreground leading-relaxed text-pretty">
                                    {product.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-8 flex-wrap">
                                  <span className="text-3xl font-bold text-primary">
                                    {formatCurrency(product.price)}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-base text-muted-foreground">{t("stock")}:</span>
                                    <Badge
                                      variant={
                                        product.stock_quantity > 10
                                          ? "default"
                                          : product.stock_quantity > 0
                                            ? "secondary"
                                            : "destructive"
                                      }
                                      className="rounded-xl px-3 py-1 text-base"
                                    >
                                      {product.stock_quantity} {t("available")}
                                    </Badge>
                                  </div>
                                </div>

                                {product.shops && (
                                  <div className="flex items-center gap-3 text-base">
                                    <Store className="h-5 w-5 text-primary" />
                                    <Link
                                      href={`/shop/${product.shop_id}`}
                                      className="text-muted-foreground hover:text-primary transition-colors font-medium"
                                    >
                                      {product.shops.name}
                                    </Link>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-4 lg:items-end">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => handleRequestNotification(product.id)}
                                    className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-all duration-200 rounded-2xl px-6 py-3 text-base font-medium w-full lg:w-auto"
                                  >
                                    <Bell className="h-4 w-4 mr-2" />
                                    {t("notifyMe")}
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
