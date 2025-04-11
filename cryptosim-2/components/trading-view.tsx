"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CryptoData } from "@/types/crypto"
import type { PortfolioItem } from "@/types/portfolio"
import { formatCurrency } from "@/lib/utils"
import PriceChart from "@/components/price-chart"
import { Skeleton } from "@/components/ui/skeleton"

interface TradingViewProps {
  cryptoData: CryptoData[]
  isLoading: boolean
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
  portfolio: PortfolioItem[]
}

export default function TradingView({ cryptoData, isLoading, executeOrder, portfolio }: TradingViewProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set default selected crypto when data loads
  useEffect(() => {
    if (cryptoData.length > 0 && !selectedCrypto) {
      setSelectedCrypto(cryptoData[0].id)
    }
  }, [cryptoData, selectedCrypto])

  const selectedCryptoData = cryptoData.find((crypto) => crypto.id === selectedCrypto)

  const portfolioItem = portfolio.find((item) => selectedCryptoData && item.symbol === selectedCryptoData.symbol)

  const availableBalance = portfolioItem ? portfolioItem.amount : 0
  const estimatedCost = selectedCryptoData && amount ? Number.parseFloat(amount) * selectedCryptoData.currentPrice : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCryptoData || !amount || isSubmitting) return

    const amountValue = Number.parseFloat(amount)

    if (isNaN(amountValue) || amountValue <= 0) return

    // Prevent multiple submissions
    setIsSubmitting(true)

    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current)
    }

    executeOrder(orderType, selectedCryptoData.symbol, amountValue, selectedCryptoData.currentPrice)

    // Reset amount after order
    setAmount("")

    // Reset submission state after a delay
    submitTimeoutRef.current = setTimeout(() => {
      setIsSubmitting(false)
    }, 2000) // 2 second cooldown
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
          <CardDescription>
            {selectedCryptoData
              ? `${selectedCryptoData.name} (${selectedCryptoData.symbol}) Price Chart`
              : "Select a cryptocurrency"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <PriceChart
              symbol={selectedCryptoData?.symbol || ""}
              currentPrice={selectedCryptoData?.currentPrice || 0}
              sparklineData={selectedCryptoData?.sparklineIn7d?.price}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trade</CardTitle>
          <CardDescription>Buy and sell cryptocurrencies</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="buy" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" onClick={() => setOrderType("buy")}>
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" onClick={() => setOrderType("sell")}>
                Sell
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crypto">Cryptocurrency</Label>
                <Select value={selectedCrypto} onValueChange={setSelectedCrypto} disabled={isLoading}>
                  <SelectTrigger id="crypto">
                    <SelectValue placeholder="Select a cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoData.map((crypto) => (
                      <SelectItem key={crypto.id} value={crypto.id}>
                        {crypto.name} ({crypto.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="amount">Amount</Label>
                  {orderType === "sell" && selectedCryptoData && (
                    <span className="text-sm text-muted-foreground">
                      Available: {availableBalance.toFixed(8)} {selectedCryptoData.symbol}
                    </span>
                  )}
                </div>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Amount in ${selectedCryptoData?.symbol || "crypto"}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.00000001"
                />
              </div>

              {selectedCryptoData && (
                <div className="space-y-2">
                  <Label>Market Price</Label>
                  <div className="text-lg font-bold">{formatCurrency(selectedCryptoData.currentPrice)}</div>
                </div>
              )}

              {amount && selectedCryptoData && (
                <div className="space-y-2">
                  <Label>Estimated {orderType === "buy" ? "Cost" : "Proceeds"}</Label>
                  <div className="text-lg font-bold">{formatCurrency(estimatedCost)}</div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading ||
                  isSubmitting ||
                  !selectedCryptoData ||
                  !amount ||
                  Number.parseFloat(amount) <= 0 ||
                  (orderType === "sell" && Number.parseFloat(amount) > availableBalance)
                }
              >
                {isSubmitting ? "Processing..." : `${orderType === "buy" ? "Buy" : "Sell"} ${selectedCryptoData?.symbol}`}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

