"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, Wifi, Clock } from "lucide-react"
import type { CryptoData } from "@/types/crypto"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Props for the MarketOverview component
interface MarketOverviewProps {
  cryptoData: CryptoData[]
  isLoading: boolean
  error?: string | null
  isLiveData?: boolean
  refreshData?: () => void
}

// Displays a searchable, refreshable table of cryptocurrency market data
export default function MarketOverview({
  cryptoData,
  isLoading,
  error,
  isLiveData = false,
  refreshData,
}: MarketOverviewProps) {
  // State for the search input
  const [searchTerm, setSearchTerm] = useState("")

  // Filter the crypto data based on the search term (by name or symbol)
  const filteredData = cryptoData.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>Cryptocurrency market data</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Show whether data is live or simulated */}
            {isLiveData ? (
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                <Wifi className="h-3 w-3" />
                Live Data
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-3 w-3" />
                Simulated Data
              </Badge>
            )}
            {/* Button to refresh data, if provided */}
            {refreshData && (
              <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
                <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
        {/* Search input for filtering cryptocurrencies */}
        <div className="pt-2">
          <Input
            placeholder="Search cryptocurrencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Show error alert if there is an error */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Show loading skeletons while data is loading */}
        {isLoading ? (
          <div className="space-y-2">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
          </div>
        ) : (
          // Table of filtered cryptocurrency data
          <div className="h-[500px] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right">Volume (24h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Render each cryptocurrency as a table row */}
                {filteredData.map((crypto) => (
                  <TableRow key={crypto.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {crypto.image && (
                          <img
                            src={crypto.image}
                            alt={crypto.name}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.src = `/placeholder.svg?text=${crypto.symbol}`
                            }}
                          />
                        )}
                        {crypto.name}
                      </div>
                    </TableCell>
                    <TableCell>{crypto.symbol}</TableCell>
                    <TableCell className="text-right">{formatCurrency(crypto.currentPrice)}</TableCell>
                    <TableCell
                      className={`text-right ${crypto.priceChangePercentage24h >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {formatPercentage(crypto.priceChangePercentage24h)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(crypto.marketCap)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(crypto.totalVolume)}</TableCell>
                  </TableRow>
                ))}
                {/* Show message if no cryptocurrencies match the search */}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No cryptocurrencies found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

