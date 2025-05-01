"use client"

import { useState, useEffect, useRef } from "react"
import type { CryptoData } from "@/types/crypto"
import { fetchCryptoData, setupPriceUpdates, generateMockPriceUpdates } from "@/lib/crypto-api"

export function useCryptoData() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiveData, setIsLiveData] = useState(false)
  const [usingMockData, setUsingMockData] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Function to validate price data
  const validatePriceData = (data: CryptoData[]) => {
    return data.every(crypto => {
      const price = crypto.currentPrice
      return (
        typeof price === 'number' &&
        !isNaN(price) &&
        price > 0 &&
        price < 1000000 // Sanity check for unrealistic prices
      )
    })
  }

  // Function to set up live price updates
  const setupLiveUpdates = () => {
    return setupPriceUpdates(
      (updatedPrices) => {
        setCryptoData(prevData => 
          prevData.map(crypto => ({
            ...crypto,
            currentPrice: updatedPrices[crypto.id] || crypto.currentPrice
          }))
        )
      },
      (error) => {
        console.error('Price update error:', error)
        // Don't set error state for individual update failures
      }
    )
  }

  // Function to set up mock data updates
  const setupMockUpdates = (baseData: CryptoData[]) => {
    return generateMockPriceUpdates(baseData, (updatedPrices) => {
      setCryptoData(prevData =>
        prevData.map(crypto => ({
          ...crypto,
          currentPrice: updatedPrices[crypto.id] || crypto.currentPrice
        }))
      )
    })
  }

  useEffect(() => {
    let isMounted = true
    let cleanup: (() => void) | undefined

    async function initializeData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch initial data
        const initialData = await fetchCryptoData()

        if (!isMounted) return

        if (initialData.length === 0) {
          throw new Error('No cryptocurrency data received')
        }

        // Validate the data
        if (!validatePriceData(initialData)) {
          throw new Error('Invalid price data received')
        }

        setCryptoData(initialData)
        setIsLoading(false)

        // Determine if we're using real or mock data
        const hasDetailedPrices = initialData.some((crypto) => 
          crypto.currentPrice > 0 && 
          crypto.priceChangePercentage24h !== 0
        )

        setIsLiveData(hasDetailedPrices)
        setUsingMockData(!hasDetailedPrices)

        // Set up appropriate price updates
        cleanup = hasDetailedPrices ? 
          setupLiveUpdates() : 
          setupMockUpdates(initialData)

        if (!hasDetailedPrices) {
          setError("Using simulated price data due to API limitations")
        }

      } catch (err) {
        console.error("Error initializing crypto data:", err)
        
        if (!isMounted) return

        // Create fallback mock data
        const mockData: CryptoData[] = [
          {
            id: 'bitcoin',
            symbol: 'BTC',
            name: 'Bitcoin',
            image: '/crypto-icons/btc.png',
            currentPrice: 65000,
            marketCap: 1200000000000,
            totalVolume: 30000000000,
            priceChangePercentage24h: 0,
            sparklineIn7d: { price: [] }
          },
          {
            id: 'ethereum',
            symbol: 'ETH',
            name: 'Ethereum',
            image: '/crypto-icons/eth.png',
            currentPrice: 3500,
            marketCap: 400000000000,
            totalVolume: 15000000000,
            priceChangePercentage24h: 0,
            sparklineIn7d: { price: [] }
          }
        ]

        setCryptoData(mockData)
        setIsLoading(false)
        setError("Using simulated data due to API error")
        setUsingMockData(true)
        
        // Set up mock updates for fallback data
        cleanup = setupMockUpdates(mockData)
      }
    }

    initializeData()

    return () => {
      isMounted = false
      if (cleanup) cleanup()
    }
  }, [])

  // Function to manually refresh data
  const refreshData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const freshData = await fetchCryptoData()

      if (freshData.length > 0) {
        setCryptoData(freshData)

        // Check if we're using real or mock data
        const hasDetailedPrices = freshData.some((crypto) => 
          crypto.currentPrice > 0 && 
          crypto.priceChangePercentage24h !== 0
        );

        setIsLiveData(hasDetailedPrices)
        setUsingMockData(!hasDetailedPrices)

        // Clean up any existing updates
        if (cleanupRef.current) {
          cleanupRef.current()
        }

        if (hasDetailedPrices) {
          // Set up real price updates
          cleanupRef.current = setupLiveUpdates()
        } else {
          // Set up mock price updates
          setError("Using simulated price data due to API limitations.")
          cleanupRef.current = setupMockUpdates(freshData)
        }
      } else {
        setError("Could not refresh data. Using simulated data instead.")
        setUsingMockData(true)
      }
    } catch (err) {
      console.error("Error refreshing crypto data:", err)
      setError("Failed to refresh cryptocurrency data. Using simulated data.")
      setUsingMockData(true)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    cryptoData,
    isLoading,
    error,
    isLiveData,
    usingMockData,
    refreshData,
  }
}

// Helper function to generate mock sparkline data
function generateMockSparklineData(basePrice: number, volatilityPercent: number, points: number): number[] {
  const result = []
  let price = basePrice

  for (let i = 0; i < points; i++) {
    // Random walk with mean reversion
    const changePercent = ((Math.random() * 2 - 1) * volatilityPercent) / 100
    price = price * (1 + changePercent)

    // Mean reversion
    price = price * 0.99 + basePrice * 0.01

    result.push(price)
  }

  return result
}

