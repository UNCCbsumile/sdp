"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Header from "@/components/header"
import MarketOverview from "@/components/market-overview"
import TradingView from "@/components/trading-view"
import Portfolio from "@/components/portfolio"
import { usePortfolio } from "@/hooks/use-portfolio"
import { useCryptoData } from "@/hooks/use-crypto-data"
import { Leaderboard } from "@/components/leaderboard"

// The main Dashboard component for the app
export default function Dashboard() {
  // Fetches cryptocurrency data and related loading/error states
  const { cryptoData, isLoading, error, isLiveData, refreshData } = useCryptoData()
  // Manages the user's portfolio, including executing orders and calculating value
  const { portfolio, executeOrder, portfolioValue, resetPortfolio } = usePortfolio(cryptoData)
  // State to track which tab is currently active
  const [activeTab, setActiveTab] = useState("market")

  return (
    // Main container for the dashboard layout
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header displays the current portfolio value */}
      <Header portfolioValue={portfolioValue} />

      <div className="container mx-auto px-4 py-6 flex-1">
        {/* Tab navigation for switching between views */}
        <Tabs defaultValue="market" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="market">Market Overview</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Market Overview Tab */}
          <TabsContent value="market" className="space-y-4">
            <MarketOverview
              cryptoData={cryptoData}
              isLoading={isLoading}
              error={error}
              isLiveData={isLiveData}
              refreshData={refreshData}
            />
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-4">
            <TradingView
              cryptoData={cryptoData}
              isLoading={isLoading}
              executeOrder={executeOrder}
              portfolio={portfolio}
            />
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-4">
            <Portfolio 
              portfolio={portfolio} 
              cryptoData={cryptoData} 
              executeOrder={executeOrder}
              resetPortfolio={resetPortfolio}
            />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

