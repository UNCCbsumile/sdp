"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Props for the PriceChart component
interface PriceChartProps {
  symbol: string
  currentPrice: number
  sparklineData?: number[]
}

// Supported time ranges for the chart
type TimeRange = "1D" | "1W" | "1M" | "1Y"

// Data structure for each chart point
interface ChartData {
  timestamp: number
  price: number
}

// Main PriceChart component: displays a line chart for a crypto asset
export default function PriceChart({ symbol, currentPrice, sparklineData = [] }: PriceChartProps) {
  // State for selected time range
  const [timeRange, setTimeRange] = useState<TimeRange>("1D")
  // State for chart data points
  const [chartData, setChartData] = useState<ChartData[]>([])
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(true)
  // Refs to track previous symbol and price for updates
  const prevSymbolRef = useRef<string>("")
  const prevPriceRef = useRef<number>(0)
  const chartDataRef = useRef<ChartData[]>([])

  // Effect: Initialize chart data when symbol or time range changes
  useEffect(() => {
    if (!symbol) return

    // Reset chart if the symbol changes
    if (prevSymbolRef.current !== symbol) {
      setChartData([])
      chartDataRef.current = []
      setIsLoading(true)
      prevSymbolRef.current = symbol
      prevPriceRef.current = currentPrice

      // Generate initial historical data for the chart
      generateHistoricalData()
    }
  }, [symbol, currentPrice, timeRange, sparklineData])

  // Effect: Update chart with real-time price changes
  useEffect(() => {
    if (!symbol || chartDataRef.current.length === 0) return

    // Only update if price has changed
    if (currentPrice !== prevPriceRef.current) {
      prevPriceRef.current = currentPrice

      // For 1D view, add a new price point
      if (timeRange === "1D") {
        const now = Date.now()

        // Add new data point to the end
        const newData = [...chartDataRef.current, { timestamp: now, price: currentPrice }]

        // Keep only the last 24 points for 1D view
        const dataToKeep = newData.slice(-24)

        chartDataRef.current = dataToKeep
        setChartData(dataToKeep)
      } else {
        // For other views, just update the last price
        const newData = [...chartDataRef.current]
        if (newData.length > 0) {
          newData[newData.length - 1].price = currentPrice
          chartDataRef.current = newData
          setChartData(newData)
        }
      }
    }
  }, [currentPrice, symbol, timeRange])

  // Function: Generate historical data for the chart
  const generateHistoricalData = () => {
    setIsLoading(true)

    const now = Date.now()
    let data: ChartData[] = []

    // If sparkline data is available, use it
    if (sparklineData && sparklineData.length > 0) {
      // CoinGecko sparkline data is for 7 days with 168 data points (hourly)
      const hourMs = 60 * 60 * 1000

      // Map sparkline data to chart data with timestamps
      data = sparklineData.map((price, index) => {
        // Calculate timestamp (now - (168 - index) hours)
        const timestamp = now - (sparklineData.length - 1 - index) * hourMs
        return { timestamp, price }
      })

      // Ensure the last point has the current price
      if (data.length > 0) {
        data[data.length - 1].price = currentPrice
      }
    } else {
      // If no sparkline data, generate mock data based on time range
      // Set time range parameters
      let dataPoints = 0
      let timeStep = 0
      let volatility = 0
      let startTime = now

      switch (timeRange) {
        case "1D":
          dataPoints = 24 // 24 points for hourly data
          timeStep = 60 * 60 * 1000 // 1 hour
          startTime = now - (24 * 60 * 60 * 1000) // 24 hours ago
          volatility = 0.005
          break
        case "1W":
          dataPoints = 7 * 24 // 168 points for hourly data over a week
          timeStep = 60 * 60 * 1000 // 1 hour
          startTime = now - (7 * 24 * 60 * 60 * 1000) // 7 days ago
          volatility = 0.02
          break
        case "1M":
          dataPoints = 30 // 30 points for daily data
          timeStep = 24 * 60 * 60 * 1000 // 1 day
          startTime = now - (30 * 24 * 60 * 60 * 1000) // 30 days ago
          volatility = 0.05
          break
        case "1Y":
          dataPoints = 365 // 365 points for daily data
          timeStep = 24 * 60 * 60 * 1000 // 1 day
          startTime = now - (365 * 24 * 60 * 60 * 1000) // 365 days ago
          volatility = 0.2
          break
      }

      // Generate price data with some randomness
      let price = currentPrice
      
      // Add current price as the last point
      data.push({
        timestamp: now,
        price: currentPrice,
      })

      // Generate historical points working backwards
      for (let i = 1; i <= dataPoints; i++) {
        const timestamp = now - (i * timeStep)
        
        // Add some random price movement (more realistic going backwards)
        const change = price * (Math.random() * volatility * 2 - volatility)
        price = Math.max(0.01, price + change)

        data.unshift({
          timestamp,
          price,
        })
      }
    }

    chartDataRef.current = data
    setChartData(data)
    setIsLoading(false)
  }

  // Function to format the X axis labels based on the selected time range
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp)

    switch (timeRange) {
      case "1D":
        // Show hour and minute for 1D
        return date.toLocaleTimeString([], { 
          hour: 'numeric',
          minute: '2-digit',
          hour12: true 
        }).toLowerCase()
      case "1W":
        // Show weekday for 1W
        return date.toLocaleDateString([], { 
          weekday: 'short'
        })
      case "1M":
        // Show day of month for 1M
        return date.getDate().toString()
      case "1Y":
        // Show month for 1Y
        return date.toLocaleDateString([], { 
          month: 'short'
        })
      default:
        return date.toLocaleDateString()
    }
  }

  // Custom tooltip for the chart, showing date and price
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 bg-background border shadow-md">
          <div className="text-sm">
            <div>{new Date(payload[0].payload.timestamp).toLocaleString()}</div>
            <div className="font-bold">{formatCurrency(payload[0].value)}</div>
          </div>
        </Card>
      )
    }
    return null
  }

  // If no symbol is selected, show a message
  if (!symbol) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        Please select a cryptocurrency to view its chart.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with current price and time range selector */}
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>

        {/* Dropdown to select time range */}
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1D">1D</SelectItem>
            <SelectItem value="1W">1W</SelectItem>
            <SelectItem value="1M">1M</SelectItem>
            <SelectItem value="1Y">1Y</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show loading skeleton or the chart */}
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                minTickGap={30}
                interval="preserveEnd"
                tickCount={6}
              />
              <YAxis domain={["auto", "auto"]} tickFormatter={(value) => formatCurrency(value, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

