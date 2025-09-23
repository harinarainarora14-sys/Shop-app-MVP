"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Receipt, TrendingUp, Calendar, Store } from "lucide-react"
import { useRouter } from "next/navigation"

interface Purchase {
  id: string
  amount: number
  description: string
  purchase_date: string
  shops: {
    name: string
    address: string
  }
}

interface PurchasesByPeriodStats {
  totalAmount: number
  count: number
  averageAmount: number
}

interface PurchasesByPeriodItem {
  purchases: Purchase[]
  stats: PurchasesByPeriodStats
}

interface PurchasesByPeriod {
  today: PurchasesByPeriodItem
  thisWeek: PurchasesByPeriodItem
  thisMonth: PurchasesByPeriodItem
}

export function PurchaseHistory({ purchases }: { purchases: Purchase[] }) {
  const router = useRouter()

  // Calculate purchase statistics by period
  const purchasesByPeriod = useMemo(() => {
    const now = new Date()
    const periods: PurchasesByPeriod = {
      today: { purchases: [], stats: { totalAmount: 0, count: 0, averageAmount: 0 } },
      thisWeek: { purchases: [], stats: { totalAmount: 0, count: 0, averageAmount: 0 } },
      thisMonth: { purchases: [], stats: { totalAmount: 0, count: 0, averageAmount: 0 } },
    }

    purchases.forEach((purchase) => {
      const purchaseDate = new Date(purchase.purchase_date)

      // Today's purchases
      if (purchaseDate.toDateString() === now.toDateString()) {
        periods.today.purchases.push(purchase)
        periods.today.stats.totalAmount += purchase.amount
        periods.today.stats.count++
      }

      // This week's purchases
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      if (purchaseDate >= weekStart) {
        periods.thisWeek.purchases.push(purchase)
        periods.thisWeek.stats.totalAmount += purchase.amount
        periods.thisWeek.stats.count++
      }

      // This month's purchases
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      if (purchaseDate >= monthStart) {
        periods.thisMonth.purchases.push(purchase)
        periods.thisMonth.stats.totalAmount += purchase.amount
        periods.thisMonth.stats.count++
      }
    })

    // Calculate averages
    Object.values(periods).forEach((period) => {
      period.stats.averageAmount =
        period.stats.count > 0 ? period.stats.totalAmount / period.stats.count : 0
    })

    return periods
  }, [purchases])

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["Date", "Shop", "Address", "Description", "Amount"]
    const rows = purchases.map((purchase) => [
      new Date(purchase.purchase_date).toLocaleDateString(),
      purchase.shops.name,
      purchase.shops.address,
      purchase.description,
      purchase.amount.toFixed(2),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `purchases_${new Date().toISOString().split("T")[0]}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Analytics
  const analytics = useMemo(() => {
    const totalSpent = purchases.reduce((sum, p) => sum + p.amount, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthlySpent = purchases
      .filter((p) => new Date(p.purchase_date) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0)

    const shopSpending = purchases.reduce((acc, p) => {
      const name = p.shops.name
      acc[name] = (acc[name] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    const topShops = Object.entries(shopSpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    return { totalSpent, monthlySpent, totalPurchases: purchases.length, topShops }
  }, [purchases])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="ml-4">
              <h1 className="font-semibold">Purchase History</h1>
              <p className="text-sm text-muted-foreground">
                Track your local shopping
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Receipt className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Total Spent */}
              <Card>
                <CardHeader className="flex justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.totalSpent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">All time spending</p>
                </CardContent>
              </Card>

              {/* This Month */}
              <Card>
                <CardHeader className="flex justify-between pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.monthlySpent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Current month spending</p>
                </CardContent>
              </Card>

              {/* Total Purchases */}
              <Card>
                <CardHeader className="flex justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalPurchases}</div>
                  <p className="text-xs text-muted-foreground">Number of transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Shops */}
            <Card>
              <CardHeader>
                <CardTitle>Top Shops</CardTitle>
                <CardDescription>Your most visited local shops</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topShops.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.topShops.map(([shopName, amount], index) => (
                      <div
                        key={shopName}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <h4 className="font-medium">{shopName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Total spent: ${amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Recent Purchases</h2>
            {purchases.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No purchases recorded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <Card key={purchase.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{purchase.shops.name}</h3>
                            <Badge variant="outline">${purchase.amount.toFixed(2)}</Badge>
                          </div>
                          {purchase.description && (
                            <p className="text-muted-foreground">{purchase.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDate(purchase.purchase_date)}</span>
                            <span>{purchase.shops.address}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
