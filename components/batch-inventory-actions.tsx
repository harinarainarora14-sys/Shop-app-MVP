"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { CheckSquare, Trash2, Edit, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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

interface BatchInventoryActionsProps {
  products: Product[]
  onProductsUpdated: () => void
}

export function BatchInventoryActions({ products, onProductsUpdated }: BatchInventoryActionsProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [batchAction, setBatchAction] = useState<"update" | "delete">("update")
  const [batchPrice, setBatchPrice] = useState("")
  const [batchStock, setBatchStock] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

  const selectedProductsData = products.filter((p) => selectedProducts.includes(p.id))
  const lowStockProducts = products.filter((p) => p.stock_quantity < 5)
  const outOfStockProducts = products.filter((p) => p.stock_quantity === 0)

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((p) => p.id))
    }
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const handleBatchUpdate = async () => {
    if (selectedProducts.length === 0) return

    setIsLoading(true)

    try {
      const updates: any = {}
      if (batchPrice) updates.price = Number.parseFloat(batchPrice)
      if (batchStock) {
        updates.stock_quantity = Number.parseInt(batchStock)
        updates.is_available = Number.parseInt(batchStock) > 0
      }

      const { error } = await supabase.from("products").update(updates).in("id", selectedProducts)

      if (error) throw error

      toast({
        title: "Products Updated",
        description: `${selectedProducts.length} products updated successfully`,
      })

      setSelectedProducts([])
      setBatchPrice("")
      setBatchStock("")
      setIsOpen(false)
      onProductsUpdated()
    } catch (error) {
      console.error("Error updating products:", error)
      toast({
        title: "Error",
        description: "Failed to update products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedProducts.length === 0) return

    setIsLoading(true)

    try {
      const { error } = await supabase.from("products").delete().in("id", selectedProducts)

      if (error) throw error

      toast({
        title: "Products Deleted",
        description: `${selectedProducts.length} products deleted successfully`,
      })

      setSelectedProducts([])
      setIsOpen(false)
      onProductsUpdated()
    } catch (error) {
      console.error("Error deleting products:", error)
      toast({
        title: "Error",
        description: "Failed to delete products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickRestock = async (productIds: string[], stockAmount: number) => {
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock_quantity: stockAmount,
          is_available: stockAmount > 0,
        })
        .in("id", productIds)

      if (error) throw error

      toast({
        title: "Products Restocked",
        description: `${productIds.length} products restocked to ${stockAmount} units`,
      })

      onProductsUpdated()
    } catch (error) {
      console.error("Error restocking products:", error)
      toast({
        title: "Error",
        description: "Failed to restock products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions for Low Stock */}
      <AnimatePresence>
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertTriangle className="h-5 w-5" />
                  Stock Alerts
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Quick actions for low stock and out-of-stock items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {lowStockProducts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-orange-900">Low Stock ({lowStockProducts.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuickRestock(
                                lowStockProducts.map((p) => p.id),
                                20,
                              )
                            }
                            disabled={isLoading}
                            className="rounded-xl border-orange-300 text-orange-700 hover:bg-orange-100"
                          >
                            Restock to 20
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuickRestock(
                                lowStockProducts.map((p) => p.id),
                                50,
                              )
                            }
                            disabled={isLoading}
                            className="rounded-xl border-orange-300 text-orange-700 hover:bg-orange-100"
                          >
                            Restock to 50
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-orange-700">
                        {lowStockProducts
                          .slice(0, 3)
                          .map((p) => p.name)
                          .join(", ")}
                        {lowStockProducts.length > 3 && ` and ${lowStockProducts.length - 3} more`}
                      </div>
                    </div>
                  )}

                  {outOfStockProducts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-red-900">Out of Stock ({outOfStockProducts.length})</h4>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuickRestock(
                                outOfStockProducts.map((p) => p.id),
                                10,
                              )
                            }
                            disabled={isLoading}
                            className="rounded-xl border-red-300 text-red-700 hover:bg-red-100"
                          >
                            Restock to 10
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuickRestock(
                                outOfStockProducts.map((p) => p.id),
                                25,
                              )
                            }
                            disabled={isLoading}
                            className="rounded-xl border-red-300 text-red-700 hover:bg-red-100"
                          >
                            Restock to 25
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-red-700">
                        {outOfStockProducts
                          .slice(0, 3)
                          .map((p) => p.name)
                          .join(", ")}
                        {outOfStockProducts.length > 3 && ` and ${outOfStockProducts.length - 3} more`}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedProducts.length === products.length && products.length > 0}
              onCheckedChange={handleSelectAll}
              className="rounded"
            />
            <Label className="text-base font-medium">Select All ({selectedProducts.length} selected)</Label>
          </div>

          <AnimatePresence>
            {selectedProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <Badge variant="secondary" className="rounded-xl px-3 py-1">
                  {selectedProducts.length} selected
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl px-6 py-3 text-base">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Batch Actions
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Batch Actions</DialogTitle>
                    <DialogDescription className="text-base">
                      Apply actions to {selectedProducts.length} selected products
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs value={batchAction} onValueChange={(value) => setBatchAction(value as "update" | "delete")}>
                    <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/30 rounded-2xl">
                      <TabsTrigger value="update" className="rounded-xl">
                        <Edit className="h-4 w-4 mr-2" />
                        Update
                      </TabsTrigger>
                      <TabsTrigger value="delete" className="rounded-xl text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="update" className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <div className="grid gap-3">
                          <Label htmlFor="batch-price" className="text-base font-medium">
                            Update Price (Optional)
                          </Label>
                          <Input
                            id="batch-price"
                            type="number"
                            step="0.01"
                            placeholder="Leave empty to keep current prices"
                            value={batchPrice}
                            onChange={(e) => setBatchPrice(e.target.value)}
                            className="h-12 text-base rounded-2xl border-2"
                          />
                        </div>

                        <div className="grid gap-3">
                          <Label htmlFor="batch-stock" className="text-base font-medium">
                            Update Stock (Optional)
                          </Label>
                          <Input
                            id="batch-stock"
                            type="number"
                            placeholder="Leave empty to keep current stock"
                            value={batchStock}
                            onChange={(e) => setBatchStock(e.target.value)}
                            className="h-12 text-base rounded-2xl border-2"
                          />
                        </div>

                        <div className="p-4 bg-muted/30 rounded-2xl">
                          <h4 className="font-medium text-foreground mb-2">Selected Products:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedProductsData.map((product) => (
                              <div key={product.id} className="text-sm text-muted-foreground">
                                {product.name} - ${product.price} (Stock: {product.stock_quantity})
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={handleBatchUpdate}
                          disabled={isLoading || (!batchPrice && !batchStock)}
                          className="w-full h-12 text-base font-medium rounded-2xl"
                        >
                          {isLoading ? "Updating..." : "Update Products"}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="delete" className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <h4 className="font-medium text-red-900">Warning</h4>
                          </div>
                          <p className="text-sm text-red-700">
                            This action cannot be undone. {selectedProducts.length} products will be permanently
                            deleted.
                          </p>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-2xl">
                          <h4 className="font-medium text-foreground mb-2">Products to Delete:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedProductsData.map((product) => (
                              <div key={product.id} className="text-sm text-muted-foreground">
                                {product.name}
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={handleBatchDelete}
                          disabled={isLoading}
                          variant="destructive"
                          className="w-full h-12 text-base font-medium rounded-2xl"
                        >
                          {isLoading ? "Deleting..." : "Delete Products"}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Selection List */}
      <div className="space-y-4">
        {products.map((product) => (
          <motion.div
            key={product.id}
            whileHover={{ scale: 1.01 }}
            className={`
              p-4 border-2 rounded-2xl transition-all duration-200 cursor-pointer
              ${
                selectedProducts.includes(product.id)
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }
            `}
            onClick={() => handleSelectProduct(product.id)}
          >
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => handleSelectProduct(product.id)}
                className="rounded"
              />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <Badge
                    variant={
                      product.stock_quantity > 5 ? "default" : product.stock_quantity > 0 ? "secondary" : "destructive"
                    }
                    className="rounded-xl text-xs"
                  >
                    {product.stock_quantity > 5
                      ? "In Stock"
                      : product.stock_quantity > 0
                        ? "Low Stock"
                        : "Out of Stock"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-medium text-primary">${product.price}</span>
                  <span>Stock: {product.stock_quantity}</span>
                  {product.categories && <span>{product.categories.name}</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
