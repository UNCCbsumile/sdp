"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Header from "@/components/header"
import MarketOverview from "@/components/market-overview"
import TradingView from "@/components/trading-view"
import Portfolio from "@/components/portfolio"
import { usePortfolio } from "@/hooks/use-portfolio"
import { useCryptoData } from "@/hooks/use-crypto-data"

export default function Dashboard() {
  const { cryptoData, isLoading, error, isLiveData, refreshData } = useCryptoData()
  const { portfolio, executeOrder, portfolioValue } = usePortfolio()
  const [activeTab, setActiveTab] = useState("market")

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header portfolioValue={portfolioValue} />

      <div className="container mx-auto px-4 py-6 flex-1">
        <Tabs defaultValue="market" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="market">Market Overview</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-4">
            <MarketOverview
              cryptoData={cryptoData}
              isLoading={isLoading}
              error={error}
              isLiveData={isLiveData}
              refreshData={refreshData}
            />
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <TradingView
              cryptoData={cryptoData}
              isLoading={isLoading}
              executeOrder={executeOrder}
              portfolio={portfolio}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            <Portfolio portfolio={portfolio} cryptoData={cryptoData} executeOrder={executeOrder} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

