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
import { useToast } from "@/hooks/use-toast"
import { Store, Package, Plus, Edit, Trash2, TrendingUp, LogOut, Bell } from "lucide-react"
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
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    loadNotificationCount()
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

  const handleShopToggle = async (isOpen: boolean) => {
    if (!shop) return

    try {
      const { error } = await supabase.from("shops").update({ is_open: isOpen }).eq("id", shop.id)

      if (error) throw error

      setShop({ ...shop, is_open: isOpen })
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome, {profile.full_name}</h1>
              <p className="text-muted-foreground">Let's set up your shop</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Create Your Shop
              </CardTitle>
              <CardDescription>Set up your shop profile to start connecting with customers</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleCreateShop} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Shop Name</Label>
                  <Input id="name" name="name" placeholder="My Local Shop" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" placeholder="Tell customers about your shop..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" placeholder="123 Main St, City, State" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" placeholder="(555) 123-4567" />
                </div>
                <Button type="submit" className="w-full">
                  Create Shop
                </Button>
              </form>
            </CardContent>
          </Card>
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
              <h1 className="font-semibold">{shop.name}</h1>
              <p className="text-sm text-muted-foreground">Shop Dashboard</p>
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
            <div className="flex items-center gap-2">
              <Label htmlFor="shop-status" className="text-sm">
                {shop.is_open ? "Open" : "Closed"}
              </Label>
              <Switch id="shop-status" checked={shop.is_open} onCheckedChange={handleShopToggle} />
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {products.filter((p) => p.is_available).length} available
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Shop Status</CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <Badge variant={shop.is_open ? "default" : "secondary"}>{shop.is_open ? "Open" : "Closed"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Toggle in the header</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.filter((p) => p.stock_quantity < 5).length}</div>
                  <p className="text-xs text-muted-foreground">Items with less than 5 in stock</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Products</CardTitle>
                <CardDescription>Your latest inventory items</CardDescription>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No products yet</p>
                    <p className="text-sm text-muted-foreground">Add your first product to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${product.price} • Stock: {product.stock_quantity}
                          </p>
                        </div>
                        <Badge variant={product.is_available ? "default" : "secondary"}>
                          {product.is_available ? "Available" : "Out of Stock"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Inventory Management</h2>
                <p className="text-muted-foreground">Manage your products and stock levels</p>
              </div>
              <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                      {editingProduct ? "Update product details" : "Add a new product to your inventory"}
                    </DialogDescription>
                  </DialogHeader>
                  <form action={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="product-name">Product Name</Label>
                      <Input
                        id="product-name"
                        name="name"
                        defaultValue={editingProduct?.name}
                        placeholder="Product name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-description">Description</Label>
                      <Textarea
                        id="product-description"
                        name="description"
                        defaultValue={editingProduct?.description}
                        placeholder="Product description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="product-price">Price ($)</Label>
                        <Input
                          id="product-price"
                          name="price"
                          type="number"
                          step="0.01"
                          defaultValue={editingProduct?.price}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="product-stock">Stock Quantity</Label>
                        <Input
                          id="product-stock"
                          name="stock_quantity"
                          type="number"
                          defaultValue={editingProduct?.stock_quantity}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-category">Category</Label>
                      <Select name="category_id" defaultValue={editingProduct?.category_id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingProduct ? "Update Product" : "Add Product"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium">${product.price}</span>
                          <span>Stock: {product.stock_quantity}</span>
                          <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                            {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                          {product.categories && <Badge variant="outline">{product.categories.name}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product)
                            setShowProductForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Settings</CardTitle>
                <CardDescription>Manage your shop information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Shop Name</Label>
                  <Input value={shop.name} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea value={shop.description || ""} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input value={shop.address} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input value={shop.phone || ""} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Shop ID</Label>
                  <Input value={shop.id} readOnly />
                  <p className="text-xs text-muted-foreground">
                    Share this ID with customers for manual purchase tracking
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shop settings editing will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
