"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PriceChartProps {
  symbol: string
  currentPrice: number
  sparklineData?: number[]
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y"

interface ChartData {
  timestamp: number
  price: number
}

export default function PriceChart({ symbol, currentPrice, sparklineData = [] }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1D")
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const prevSymbolRef = useRef<string>("")
  const prevPriceRef = useRef<number>(0)
  const chartDataRef = useRef<ChartData[]>([])

  // Initialize chart data when symbol changes
  useEffect(() => {
    if (!symbol) return

    // Reset chart when symbol changes
    if (prevSymbolRef.current !== symbol) {
      setChartData([])
      chartDataRef.current = []
      setIsLoading(true)
      prevSymbolRef.current = symbol
      prevPriceRef.current = currentPrice

      // Generate initial historical data
      generateHistoricalData()
    }
  }, [symbol, currentPrice, timeRange, sparklineData])

  // Update chart with real-time price
  useEffect(() => {
    if (!symbol || chartDataRef.current.length === 0) return

    // Only update if price has changed
    if (currentPrice !== prevPriceRef.current) {
      prevPriceRef.current = currentPrice

      // For 1D view, add new price point
      if (timeRange === "1D") {
        const now = Date.now()

        // Add new data point
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

  // Generate historical data based on current price and sparkline if available
  const generateHistoricalData = () => {
    setIsLoading(true)

    const now = Date.now()
    let data: ChartData[] = []

    // If we have sparkline data from CoinGecko, use it
    if (sparklineData && sparklineData.length > 0) {
      // CoinGecko sparkline data is for 7 days with 168 data points (hourly)
      const hourMs = 60 * 60 * 1000

      // Map sparkline data to chart data
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
      // If no sparkline data, generate mock data
      // Set time range parameters
      let dataPoints = 0
      let timeStep = 0
      let volatility = 0

      switch (timeRange) {
        case "1D":
          dataPoints = 24
          timeStep = 60 * 60 * 1000 // 1 hour
          volatility = 0.005
          break
        case "1W":
          dataPoints = 7
          timeStep = 24 * 60 * 60 * 1000 // 1 day
          volatility = 0.02
          break
        case "1M":
          dataPoints = 30
          timeStep = 24 * 60 * 60 * 1000 // 1 day
          volatility = 0.05
          break
        case "3M":
          dataPoints = 90
          timeStep = 24 * 60 * 60 * 1000 // 1 day
          volatility = 0.1
          break
        case "1Y":
          dataPoints = 12
          timeStep = 30 * 24 * 60 * 60 * 1000 // 1 month
          volatility = 0.2
          break
      }

      // Generate price data with some randomness
      // Start from current price and work backwards
      let price = currentPrice

      // Add current price as the last point
      data.push({
        timestamp: now,
        price: currentPrice,
      })

      // Generate historical points
      for (let i = 1; i <= dataPoints; i++) {
        const timestamp = now - i * timeStep

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

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp)

    switch (timeRange) {
      case "1D":
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      case "1W":
      case "1M":
      case "3M":
        return date.toLocaleDateString([], { month: "short", day: "numeric" })
      case "1Y":
        return date.toLocaleDateString([], { month: "short", year: "2-digit" })
      default:
        return date.toLocaleDateString()
    }
  }

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

  if (!symbol) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        Please select a cryptocurrency to view its chart.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>

        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1D">1D</SelectItem>
            <SelectItem value="1W">1W</SelectItem>
            <SelectItem value="1M">1M</SelectItem>
            <SelectItem value="3M">3M</SelectItem>
            <SelectItem value="1Y">1Y</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={formatXAxis} minTickGap={30} />
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

