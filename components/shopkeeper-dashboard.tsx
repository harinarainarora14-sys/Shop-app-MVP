"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChatList } from "@/components/chat/chat-list"
import { FloatingShopToggle } from "./floating-shop-toggle"
import { InventoryTemplates } from "./inventory-templates"
import { BatchInventoryActions } from "./batch-inventory-actions"
import { BackInStockInsights } from "./back-in-stock-insights"
import { CSVExport } from "./csv-export"
import { LanguageSelector } from "./language-selector"
import { useTranslation } from "@/hooks/use-translation"
import { loadBackInStockRequests } from "@/lib/supabase/back-in-stock-requests" // Import the missing function
import { useToast } from "@/hooks/use-toast" // Import the missing hook

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
  updated_at: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  is_available: boolean
  category_id: string
  categories?: { name: string }
}

interface Category {
  id: string
  name: string
}

export function ShopkeeperDashboard({ user, profile }: { user: User; profile: Profile }) {
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showShopForm, setShowShopForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { t, language, changeLanguage } = useTranslation()

  useEffect(() => {
    loadDashboardData()
    loadNotificationCount()
    loadUnreadMessagesCount()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load shop
      const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", user.id).single()

      setShop(shopData)

      // Load categories
      const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

      setCategories(categoriesData || [])

      // Load products if shop exists
      if (shopData) {
        const { data: productsData } = await supabase
          .from("products")
          .select(`
            *,
            categories (name)
          `)
          .eq("shop_id", shopData.id)
          .order("name")

        setProducts(productsData || [])
      }
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

  const loadUnreadMessagesCount = async () => {
    if (!shop) return

    try {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user.id) // Don't count own messages
        .in("conversation_id", supabase.from("conversations").select("id").eq("shop_id", shop.id))

      setUnreadMessages(count || 0)
    } catch (error) {
      console.error("Error loading unread messages count:", error)
    }
  }

  const handleShopToggle = async (isOpen: boolean) => {
    if (!shop) return

    setShop({ ...shop, is_open: isOpen, updated_at: new Date().toISOString() })

    try {
      const { error } = await supabase
        .from("shops")
        .update({ is_open: isOpen, updated_at: new Date().toISOString() })
        .eq("id", shop.id)

      if (error) throw error

      toast({
        title: "Shop Status Updated",
        description: `Your shop is now ${isOpen ? "open" : "closed"}`,
      })
    } catch (error) {
      console.error("Error updating shop status:", error)
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      })
    }
  }

  const handleCreateShop = async (formData: FormData) => {
    try {
      const shopData = {
        owner_id: user.id,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        address: formData.get("address") as string,
        phone: formData.get("phone") as string,
        is_open: false,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("shops").insert(shopData).select().single()

      if (error) throw error

      setShop(data)
      setShowShopForm(false)
      toast({
        title: "Shop Created",
        description: "Your shop has been created successfully",
      })
    } catch (error) {
      console.error("Error creating shop:", error)
      toast({
        title: "Error",
        description: "Failed to create shop",
        variant: "destructive",
      })
    }
  }

  const handleCreateProduct = async (formData: FormData) => {
    if (!shop) return

    try {
      const productData = {
        shop_id: shop.id,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        price: Number.parseFloat(formData.get("price") as string),
        stock_quantity: Number.parseInt(formData.get("stock_quantity") as string),
        category_id: formData.get("category_id") as string,
        is_available: true,
      }

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select(`
          *,
          categories (name)
        `)
        .single()

      if (error) throw error

      setProducts([...products, data])
      setShowProductForm(false)
      setEditingProduct(null)
      toast({
        title: "Product Added",
        description: "Product has been added to your inventory",
      })
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProduct = async (formData: FormData) => {
    if (!editingProduct) return

    try {
      const productData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        price: Number.parseFloat(formData.get("price") as string),
        stock_quantity: Number.parseInt(formData.get("stock_quantity") as string),
        category_id: formData.get("category_id") as string,
        is_available: Number.parseInt(formData.get("stock_quantity") as string) > 0,
      }

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id)
        .select(`
          *,
          categories (name)
        `)
        .single()

      if (error) throw error

      setProducts(products.map((p) => (p.id === editingProduct.id ? data : p)))
      setShowProductForm(false)
      setEditingProduct(null)
      toast({
        title: "Product Updated",
        description: "Product has been updated successfully",
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== productId))
      toast({
        title: "Product Deleted",
        description: "Product has been removed from your inventory",
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

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
            Loading dashboard...
          </motion.h3>
        </motion.div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground text-balance">Welcome, {profile.full_name}</h1>
              <p className="text-lg text-muted-foreground text-pretty">Let's set up your shop</p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleSignOut} className="rounded-2xl border-2 bg-transparent">
                Sign Out
              </Button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-2xl border-0 shadow-xl bg-card/60 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl">Create Your Shop</CardTitle>
                <CardDescription className="text-base text-pretty">
                  Set up your shop profile to start connecting with customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleCreateShop} className="space-y-6">
                  <div className="grid gap-3">
                    <Label htmlFor="name" className="text-base font-medium">
                      Shop Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Local Shop"
                      required
                      className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="description" className="text-base font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Tell customers about your shop..."
                      className="min-h-24 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="address" className="text-base font-medium">
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="123 Main St, City, State"
                      required
                      className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="phone" className="text-base font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="(555) 123-4567"
                      className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" className="w-full h-12 text-base font-medium rounded-2xl">
                      Create Shop
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-card/80 backdrop-blur-xl shadow-sm"
      >
        <div className="flex h-20 items-center px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20"
            >
              {/* Placeholder for Store icon */}
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{shop.name}</h1>
              <p className="text-base text-muted-foreground">Shop Dashboard</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm" asChild className="rounded-2xl border-2 bg-transparent">
                <Link href="/chat" className="relative">
                  {/* Placeholder for MessageCircle icon */}
                  <span className="text-base">Messages</span>
                  <AnimatePresence>
                    {unreadMessages > 0 && (
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
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="sm" asChild className="rounded-2xl border-2 bg-transparent">
                <Link href="/notifications" className="relative">
                  {/* Placeholder for Bell icon */}
                  <span className="text-base">Notifications</span>
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
            <div className="flex items-center gap-3 bg-muted/30 rounded-2xl px-4 py-2 border">
              <Label htmlFor="shop-status" className="text-base font-medium">
                {shop.is_open ? "Open" : "Closed"}
              </Label>
              <Switch
                id="shop-status"
                checked={shop.is_open}
                onCheckedChange={handleShopToggle}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleSignOut} className="rounded-2xl border-2 bg-transparent">
                {/* Placeholder for LogOut icon */}
                <span className="text-base">Sign Out</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="p-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full max-w-lg grid-cols-4 h-14 p-1 bg-muted/30 backdrop-blur-sm rounded-2xl border">
              <TabsTrigger
                value="overview"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200"
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200 relative"
              >
                Chat
                {unreadMessages > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full"
                  >
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="text-base font-medium data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border rounded-xl transition-all duration-200"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              >
                <motion.div whileHover={{ scale: 1.02, y: -2 }}>
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-medium text-muted-foreground">Total Products</CardTitle>
                      {/* Placeholder for Package icon */}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{products.length}</div>
                      <p className="text-base text-muted-foreground mt-1">
                        {products.filter((p) => p.is_available).length} available
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }}>
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-medium text-muted-foreground">Shop Status</CardTitle>
                      {/* Placeholder for Store icon */}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold mb-2">
                        <Badge
                          variant={shop.is_open ? "default" : "secondary"}
                          className="text-lg px-4 py-2 rounded-xl"
                        >
                          {shop.is_open ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground">Toggle in the header</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }}>
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-medium text-muted-foreground">Customer Messages</CardTitle>
                      {/* Placeholder for MessageCircle icon */}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{unreadMessages}</div>
                      <p className="text-base text-muted-foreground mt-1">Unread messages</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }}>
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-medium text-muted-foreground">Low Stock Items</CardTitle>
                      {/* Placeholder for TrendingUp icon */}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {products.filter((p) => p.stock_quantity < 5).length}
                      </div>
                      <p className="text-base text-muted-foreground mt-1">Items with less than 5 in stock</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* CHANGE> Added back-in-stock insights section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <BackInStockInsights shopId={shop.id} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-foreground">Recent Products</CardTitle>
                    <CardDescription className="text-base">Your latest inventory items</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <div className="text-center py-12">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mx-auto mb-6"
                        >
                          {/* Placeholder for Package icon */}
                        </motion.div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No products yet</h3>
                        <p className="text-base text-muted-foreground">Add your first product to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {products.slice(0, 5).map((product, index) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.01 }}
                            className="flex items-center justify-between p-6 border rounded-2xl bg-background/50 hover:bg-background/80 transition-all duration-200"
                          >
                            <div>
                              <h4 className="text-lg font-semibold text-foreground">{product.name}</h4>
                              <p className="text-base text-muted-foreground">
                                ${product.price} • Stock: {product.stock_quantity}
                              </p>
                            </div>
                            <Badge
                              variant={product.is_available ? "default" : "secondary"}
                              className="rounded-xl px-3 py-1 text-base"
                            >
                              {product.is_available ? "Available" : "Out of Stock"}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-between items-center"
              >
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Inventory Management</h2>
                  <p className="text-lg text-muted-foreground text-pretty">Manage your products and stock levels</p>
                </div>
                <div className="flex gap-3">
                  {/* CHANGE> Added inventory templates button */}
                  <InventoryTemplates
                    categories={categories}
                    onSelectTemplate={(template) => {
                      setEditingProduct({
                        id: "",
                        name: template.name,
                        description: template.description,
                        price: template.price,
                        stock_quantity: template.typical_stock,
                        is_available: true,
                        category_id:
                          categories.find((c) => c.name === template.category)?.id || categories[0]?.id || "",
                      } as Product)
                      setShowProductForm(true)
                    }}
                  />
                  <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
                    <DialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => setEditingProduct(null)}
                          className="rounded-2xl px-6 py-3 text-base font-medium"
                        >
                          {/* Placeholder for Plus icon */}
                          Add Product
                        </Button>
                      </motion.div>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl">
                          {editingProduct ? "Edit Product" : "Add New Product"}
                        </DialogTitle>
                        <DialogDescription className="text-base">
                          {editingProduct ? "Update product details" : "Add a new product to your inventory"}
                        </DialogDescription>
                      </DialogHeader>
                      <form action={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-6">
                        <div className="grid gap-3">
                          <Label htmlFor="product-name" className="text-base font-medium">
                            Product Name
                          </Label>
                          <Input
                            id="product-name"
                            name="name"
                            defaultValue={editingProduct?.name}
                            placeholder="Product name"
                            required
                            className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                          />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="product-description" className="text-base font-medium">
                            Description
                          </Label>
                          <Textarea
                            id="product-description"
                            name="description"
                            defaultValue={editingProduct?.description}
                            placeholder="Product description"
                            className="min-h-24 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-3">
                            <Label htmlFor="product-price" className="text-base font-medium">
                              Price ($)
                            </Label>
                            <Input
                              id="product-price"
                              name="price"
                              type="number"
                              step="0.01"
                              defaultValue={editingProduct?.price}
                              placeholder="0.00"
                              required
                              className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                            />
                          </div>
                          <div className="grid gap-3">
                            <Label htmlFor="product-stock" className="text-base font-medium">
                              Stock Quantity
                            </Label>
                            <Input
                              id="product-stock"
                              name="stock_quantity"
                              type="number"
                              defaultValue={editingProduct?.stock_quantity}
                              placeholder="0"
                              required
                              className="h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="product-category" className="text-base font-medium">
                            Category
                          </Label>
                          <Select name="category_id" defaultValue={editingProduct?.category_id}>
                            <SelectTrigger className="h-12 text-base rounded-2xl border-2">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-base">
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button type="submit" className="w-full h-12 text-base font-medium rounded-2xl">
                            {editingProduct ? "Update Product" : "Add Product"}
                          </Button>
                        </motion.div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-6"
              >
                {/* CHANGE> Added batch inventory actions */}
                <BatchInventoryActions products={products} onProductsUpdated={loadDashboardData} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-6"
              >
                <AnimatePresence>
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-8">
                          <div className="flex items-center justify-between">
                            <div className="space-y-3 flex-1">
                              <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
                              <p className="text-base text-muted-foreground text-pretty">{product.description}</p>
                              <div className="flex items-center gap-6 text-base flex-wrap">
                                <span className="font-bold text-2xl text-primary">${product.price}</span>
                                <span className="text-muted-foreground">Stock: {product.stock_quantity}</span>
                                <Badge
                                  variant={product.stock_quantity > 0 ? "default" : "destructive"}
                                  className="rounded-xl px-3 py-1"
                                >
                                  {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                                </Badge>
                                {product.categories && (
                                  <Badge variant="outline" className="rounded-xl px-3 py-1">
                                    {product.categories.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingProduct(product)
                                    setShowProductForm(true)
                                  }}
                                  className="rounded-2xl border-2 px-4 py-2"
                                >
                                  {/* Placeholder for Edit icon */}
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="rounded-2xl border-2 px-4 py-2 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  {/* Placeholder for Trash2 icon */}
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </TabsContent>

            <TabsContent value="chat" className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      {/* Placeholder for MessageCircle icon */}
                      Customer Support
                    </CardTitle>
                    <CardDescription className="text-base">
                      Manage customer inquiries and provide support. Auto-responses handle common questions about hours,
                      availability, and pricing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-200">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-green-900">Auto-responses active</p>
                          <p className="text-sm text-green-700">Handling common questions</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                        {/* Placeholder for Users icon */}
                        <div>
                          <p className="font-medium text-blue-900">Quick replies ready</p>
                          <p className="text-sm text-blue-700">One-tap responses available</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                        {/* Placeholder for MessageCircle icon */}
                        <div>
                          <p className="font-medium text-orange-900">{unreadMessages} unread</p>
                          <p className="text-sm text-orange-700">Messages waiting for response</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ChatList isCustomer={false} currentUserId={user.id} />
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="grid gap-8 lg:grid-cols-2">
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground">{t("shopSettings")}</CardTitle>
                      <CardDescription className="text-base">Manage your shop information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-3">
                        <Label className="text-base font-medium">{t("shopName")}</Label>
                        <Input value={shop.name} readOnly className="h-12 text-base rounded-2xl border-2 bg-muted/30" />
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-base font-medium">{t("description")}</Label>
                        <Textarea
                          value={shop.description || ""}
                          readOnly
                          className="min-h-24 text-base rounded-2xl border-2 bg-muted/30"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-base font-medium">{t("address")}</Label>
                        <Input
                          value={shop.address}
                          readOnly
                          className="h-12 text-base rounded-2xl border-2 bg-muted/30"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-base font-medium">{t("phone")}</Label>
                        <Input
                          value={shop.phone || ""}
                          readOnly
                          className="h-12 text-base rounded-2xl border-2 bg-muted/30"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-base font-medium">Shop ID</Label>
                        <Input
                          value={shop.id}
                          readOnly
                          className="h-12 text-base rounded-2xl border-2 bg-muted/30 font-mono"
                        />
                        <p className="text-base text-muted-foreground text-pretty">
                          Share this ID with customers for manual purchase tracking
                        </p>
                      </div>
                      <div className="p-6 bg-muted/20 rounded-2xl border-2 border-dashed">
                        <p className="text-base text-muted-foreground text-pretty">
                          Shop settings editing will be available in a future update.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CHANGE> Added language selector */}
                  <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground">Language Settings</CardTitle>
                      <CardDescription className="text-base">Choose your preferred language</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LanguageSelector currentLanguage={language} onLanguageChange={changeLanguage} />
                    </CardContent>
                  </Card>
                </div>

                {/* CHANGE> Added CSV export section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <CSVExport
                    products={products}
                    backInStockRequests={loadBackInStockRequests()} // Use the imported function
                    shopName={shop.name}
                  />
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      {shop && <FloatingShopToggle shop={shop} onToggle={handleShopToggle} />}
    </div>
  )
}
