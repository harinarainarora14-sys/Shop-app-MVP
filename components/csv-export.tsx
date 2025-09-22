"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Download, FileText, Calendar, Package, Users, TrendingUp } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  is_available: boolean
  created_at: string
  categories?: { name: string }
}

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
  }
}

interface CSVExportProps {
  products: Product[]
  backInStockRequests?: BackInStockRequest[]
  shopName: string
}

export function CSVExport({ products, backInStockRequests = [], shopName }: CSVExportProps) {
  const [exportType, setExportType] = useState<string>("products")
  const [includeFields, setIncludeFields] = useState({
    name: true,
    description: true,
    price: true,
    stock: true,
    category: true,
    status: true,
    created_date: false,
  })
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const generateProductsCSV = () => {
    const headers = []
    if (includeFields.name) headers.push("Product Name")
    if (includeFields.description) headers.push("Description")
    if (includeFields.price) headers.push("Price ($)")
    if (includeFields.stock) headers.push("Stock Quantity")
    if (includeFields.category) headers.push("Category")
    if (includeFields.status) headers.push("Status")
    if (includeFields.created_date) headers.push("Created Date")

    const rows = products.map((product) => {
      const row = []
      if (includeFields.name) row.push(`"${product.name.replace(/"/g, '""')}"`)
      if (includeFields.description) row.push(`"${(product.description || "").replace(/"/g, '""')}"`)
      if (includeFields.price) row.push(product.price.toString())
      if (includeFields.stock) row.push(product.stock_quantity.toString())
      if (includeFields.category) row.push(`"${product.categories?.name || "Uncategorized"}"`)
      if (includeFields.status) row.push(product.is_available ? "Available" : "Out of Stock")
      if (includeFields.created_date) row.push(`"${formatDate(product.created_at)}"`)
      return row.join(",")
    })

    return [headers.join(","), ...rows].join("\n")
  }

  const generateBackInStockCSV = () => {
    const headers = ["Customer Name", "Email", "Product Name", "Product Price ($)", "Request Date"]

    const rows = backInStockRequests.map((request) =>
      [
        `"${request.profiles.full_name.replace(/"/g, '""')}"`,
        `"${request.profiles.email.replace(/"/g, '""')}"`,
        `"${request.products.name.replace(/"/g, '""')}"`,
        request.products.price.toString(),
        `"${formatDate(request.created_at)}"`,
      ].join(","),
    )

    return [headers.join(","), ...rows].join("\n")
  }

  const generateInventoryReportCSV = () => {
    const headers = ["Product Name", "Current Stock", "Status", "Value ($)", "Category", "Restock Priority"]

    const rows = products.map((product) => {
      const value = (product.price * product.stock_quantity).toFixed(2)
      const priority = product.stock_quantity === 0 ? "High" : product.stock_quantity < 5 ? "Medium" : "Low"

      return [
        `"${product.name.replace(/"/g, '""')}"`,
        product.stock_quantity.toString(),
        product.stock_quantity > 0 ? "In Stock" : "Out of Stock",
        value,
        `"${product.categories?.name || "Uncategorized"}"`,
        priority,
      ].join(",")
    })

    return [headers.join(","), ...rows].join("\n")
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let csvContent = ""
      let filename = ""

      switch (exportType) {
        case "products":
          csvContent = generateProductsCSV()
          filename = `${shopName.replace(/[^a-zA-Z0-9]/g, "_")}_products_${new Date().toISOString().split("T")[0]}.csv`
          break
        case "back-in-stock":
          csvContent = generateBackInStockCSV()
          filename = `${shopName.replace(/[^a-zA-Z0-9]/g, "_")}_back_in_stock_requests_${new Date().toISOString().split("T")[0]}.csv`
          break
        case "inventory-report":
          csvContent = generateInventoryReportCSV()
          filename = `${shopName.replace(/[^a-zA-Z0-9]/g, "_")}_inventory_report_${new Date().toISOString().split("T")[0]}.csv`
          break
        default:
          throw new Error("Invalid export type")
      }

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)

      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `${filename} has been downloaded`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Export Failed",
        description: "There was an error generating the CSV file",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getExportDescription = () => {
    switch (exportType) {
      case "products":
        return `Export ${products.length} products with customizable fields`
      case "back-in-stock":
        return `Export ${backInStockRequests.length} back-in-stock requests from customers`
      case "inventory-report":
        return `Export detailed inventory report with stock levels and values`
      default:
        return "Select an export type to continue"
    }
  }

  const getExportIcon = () => {
    switch (exportType) {
      case "products":
        return <Package className="h-5 w-5 text-blue-600" />
      case "back-in-stock":
        return <Users className="h-5 w-5 text-green-600" />
      case "inventory-report":
        return <TrendingUp className="h-5 w-5 text-purple-600" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Download className="h-6 w-6" />
          Export Data
        </CardTitle>
        <CardDescription className="text-base">
          Export your shop data to CSV format for analysis or backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="h-12 text-base rounded-2xl border-2">
                <SelectValue placeholder="Select what to export" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="products" className="text-base">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Product Catalog
                  </div>
                </SelectItem>
                <SelectItem value="back-in-stock" className="text-base">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    Back-in-Stock Requests
                  </div>
                </SelectItem>
                <SelectItem value="inventory-report" className="text-base">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Inventory Report
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-muted/30 rounded-2xl border">
            <div className="flex items-center gap-3 mb-2">
              {getExportIcon()}
              <span className="font-medium text-foreground">Export Preview</span>
            </div>
            <p className="text-sm text-muted-foreground">{getExportDescription()}</p>
          </div>
        </div>

        {exportType === "products" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            <Label className="text-base font-medium">Include Fields</Label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(includeFields).map(([field, checked]) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={checked}
                    onCheckedChange={(checked) =>
                      setIncludeFields((prev) => ({ ...prev, [field]: checked as boolean }))
                    }
                    className="rounded-md"
                  />
                  <Label htmlFor={field} className="text-sm font-medium capitalize">
                    {field.replace("_", " ")}
                  </Label>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Export date: {new Date().toLocaleDateString()}</span>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleExport}
              disabled={isExporting || !exportType}
              className="rounded-2xl px-6 py-3 text-base font-medium"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </motion.div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">CSV Format Notes</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Files are UTF-8 encoded for international characters</li>
                <li>• Text fields are quoted to handle commas and special characters</li>
                <li>• Dates are formatted as MM/DD/YYYY HH:MM</li>
                <li>• Compatible with Excel, Google Sheets, and other spreadsheet apps</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
