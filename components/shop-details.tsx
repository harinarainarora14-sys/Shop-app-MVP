"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, MapPin, Phone, Bell, Package } from "lucide-react"
import { useRouter } from "next/navigation"

interface Shop {
  id: string
  name: string
  description: string
  address: string
  phone: string
  is_open: boolean
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  is_available: boolean
  categories?: { name: string }
}

interface User {
  id: string
  email: string
}

export function ShopDetails({ shop, products, user }: { shop: Shop; products: Product[]; user: User }) {
  const [requestingNotifications, setRequestingNotifications] = useState<string[]>([])
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleRequestNotification = async (productId: string) => {
    if (requestingNotifications.includes(productId)) return

    setRequestingNotifications([...requestingNotifications, productId])

    try {
      const { error } = await supabase.from("back_in_stock_requests").insert({
        user_id: user.id,
        product_id: productId,
      })

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Requested",
            description: "You're already subscribed to notifications for this product",
          })
        } else {
          throw error
        }
      } else {
        toast({
          title: "Notification Requested",
          description: "You'll be notified when this item is back in stock",
        })
      }
    } catch (error) {
      console.error("Error requesting notification:", error)
      toast({
        title: "Error",
        description: "Failed to request notification",
        variant: "destructive",
      })
    } finally {
      setRequestingNotifications(requestingNotifications.filter((id) => id !== productId))
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
            <h1 className="font-semibold">{shop.name}</h1>
            <Badge variant={shop.is_open ? "default" : "secondary"} className="mt-1">
              {shop.is_open ? "Open" : "Closed"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Shop Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shop Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shop.description && <p className="text-muted-foreground">{shop.description}</p>}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{shop.address}</span>
            </div>
            {shop.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{shop.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Products</h2>
          {products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products available</p>
                <p className="text-sm text-muted-foreground">Check back later for new items</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
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
                          <Badge variant={product.stock_quantity > 0 ? "default" : "destructive"}>
                            {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestNotification(product.id)}
                          disabled={requestingNotifications.includes(product.id)}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          {requestingNotifications.includes(product.id) ? "Requesting..." : "Notify Me"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
