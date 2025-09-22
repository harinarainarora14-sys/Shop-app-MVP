"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Package, Zap, Search, Plus } from "lucide-react"

interface ProductTemplate {
  id: string
  name: string
  category: string
  description: string
  price: number
  typical_stock: number
}

interface InventoryTemplatesProps {
  categories: Array<{ id: string; name: string }>
  onSelectTemplate: (template: ProductTemplate) => void
}

const COMMON_TEMPLATES: ProductTemplate[] = [
  // Grocery
  {
    id: "1",
    name: "Rice (1kg)",
    category: "Grocery",
    description: "Premium quality rice",
    price: 2.99,
    typical_stock: 50,
  },
  { id: "2", name: "Milk (1L)", category: "Grocery", description: "Fresh whole milk", price: 1.49, typical_stock: 30 },
  { id: "3", name: "Bread", category: "Grocery", description: "Fresh white bread", price: 1.99, typical_stock: 20 },
  {
    id: "4",
    name: "Eggs (12 pack)",
    category: "Grocery",
    description: "Farm fresh eggs",
    price: 3.49,
    typical_stock: 25,
  },
  { id: "5", name: "Bananas (1kg)", category: "Grocery", description: "Fresh bananas", price: 1.99, typical_stock: 40 },

  // Beverages
  {
    id: "6",
    name: "Water Bottle",
    category: "Beverages",
    description: "500ml bottled water",
    price: 0.99,
    typical_stock: 100,
  },
  { id: "7", name: "Coca Cola", category: "Beverages", description: "330ml can", price: 1.29, typical_stock: 60 },
  {
    id: "8",
    name: "Orange Juice",
    category: "Beverages",
    description: "1L fresh orange juice",
    price: 2.99,
    typical_stock: 20,
  },

  // Snacks
  { id: "9", name: "Chips", category: "Snacks", description: "Potato chips", price: 1.99, typical_stock: 40 },
  {
    id: "10",
    name: "Chocolate Bar",
    category: "Snacks",
    description: "Milk chocolate",
    price: 1.49,
    typical_stock: 50,
  },

  // Personal Care
  {
    id: "11",
    name: "Toothpaste",
    category: "Personal Care",
    description: "Fluoride toothpaste",
    price: 2.49,
    typical_stock: 15,
  },
  {
    id: "12",
    name: "Shampoo",
    category: "Personal Care",
    description: "Hair shampoo 250ml",
    price: 3.99,
    typical_stock: 12,
  },

  // Household
  {
    id: "13",
    name: "Dish Soap",
    category: "Household",
    description: "Liquid dish soap",
    price: 1.99,
    typical_stock: 20,
  },
  { id: "14", name: "Toilet Paper", category: "Household", description: "4-roll pack", price: 4.99, typical_stock: 30 },
]

export function InventoryTemplates({ categories, onSelectTemplate }: InventoryTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isOpen, setIsOpen] = useState(false)

  const filteredTemplates = COMMON_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const uniqueCategories = Array.from(new Set(COMMON_TEMPLATES.map((t) => t.category)))

  const handleSelectTemplate = (template: ProductTemplate) => {
    onSelectTemplate(template)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" className="rounded-2xl border-2 px-6 py-3 text-base bg-transparent">
            <Zap className="h-4 w-4 mr-2" />
            Quick Add Templates
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Product Templates
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose from common products to quickly add to your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base rounded-2xl border-2"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-12 p-1 bg-muted/30 rounded-2xl">
              <TabsTrigger value="all" className="rounded-xl text-sm">
                All
              </TabsTrigger>
              {uniqueCategories.slice(0, 5).map((category) => (
                <TabsTrigger key={category} value={category} className="rounded-xl text-sm">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <Card
                      className="rounded-2xl border-2 hover:border-primary/50 cursor-pointer transition-all duration-200"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-foreground">{template.name}</h3>
                              <Badge variant="outline" className="rounded-xl text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <p className="text-base text-muted-foreground">{template.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-medium text-primary text-lg">${template.price}</span>
                              <span>Typical stock: {template.typical_stock}</span>
                            </div>
                          </div>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10"
                          >
                            <Plus className="h-5 w-5 text-primary" />
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No templates found</h3>
              <p className="text-base text-muted-foreground">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
