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
  const [timeRange, setTimeRange] = useState<TimeRange>("1D")
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Effect to fetch data when symbol or timeRange changes
  useEffect(() => {
    if (!symbol) return

    const fetchHistoricalData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Include timeRange in the request
        const response = await fetch(
          `/api/crypto/historical/${symbol}?timeRange=${timeRange}&t=${Date.now()}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch historical data')
        }
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error)
        }
        setChartData(data)
      } catch (err) {
        console.error('Error fetching historical data:', err)
        setError('No historical data available for this currency')
        setChartData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, timeRange]) // Include timeRange in dependencies

  // Handle timeRange change
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange)
    setIsLoading(true)
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
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
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

      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : error ? (
        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
          {error}
        </div>
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
              <Line 
                type="linear"
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

