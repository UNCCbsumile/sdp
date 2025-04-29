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

  // Fetch initial data and set up updates
  useEffect(() => {
    let isMounted = true

    async function initializeData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch initial data from our API route
        const initialData = await fetchCryptoData()

        if (isMounted) {
          if (initialData.length === 0) {
            // If we couldn't get data, use fallback mock data
            setError("Could not fetch cryptocurrency data. Using simulated data instead.")
            setUsingMockData(true)
          } else {
            setCryptoData(initialData)
            setIsLoading(false)

            // Check if we're using real or mock data
            // This is a heuristic - if the first few prices have fractional cents, it's likely real data
            const hasDetailedPrices = initialData
              .slice(0, 3)
              .some((crypto) => Math.round(crypto.currentPrice * 100) !== crypto.currentPrice * 100)

            setIsLiveData(hasDetailedPrices)
            setUsingMockData(!hasDetailedPrices)

            if (hasDetailedPrices) {
              // Set up real price updates
              setupLiveUpdates()
            } else {
              // Set up mock price updates
              setupMockUpdates(initialData)
              setError("Using simulated price data due to API limitations.")
            }
          }
        }
      } catch (err) {
        console.error("Error initializing crypto data:", err)
        if (isMounted) {
          //setError("Failed to fetch cryptocurrency data. Using simulated data instead.")
          setUsingMockData(true)
          setupMockData()
        }
      }
    }

    function setupLiveUpdates() {
      // Clean up any existing updates
      if (cleanupRef.current) {
        cleanupRef.current()
      }

      // Set up new updates
      cleanupRef.current = setupPriceUpdates(
        // On price update
        (updatedPrices) => {
          if (isMounted) {
            setCryptoData((prevData) => {
              return prevData.map((crypto) => {
                if (updatedPrices[crypto.id]) {
                  return {
                    ...crypto,
                    currentPrice: updatedPrices[crypto.id],
                  }
                }
                return crypto
              })
            })
          }
        },
        // On error
        (updateError) => {
          console.error("Price update error:", updateError)
          if (isMounted) {
            setError("Live price updates unavailable. Using simulated data.")
            setIsLiveData(false)

            // If we already have data, use it for mock updates
            if (cryptoData.length > 0) {
              setupMockUpdates(cryptoData)
            } else {
              setupMockData()
            }
          }
        },
      )
    }

    function setupMockUpdates(baseData: CryptoData[]) {
      // Clean up any existing updates
      if (cleanupRef.current) {
        cleanupRef.current()
      }

      setUsingMockData(true)

      // Set up mock price updates based on our current data
      cleanupRef.current = generateMockPriceUpdates(baseData, (updatedPrices) => {
        if (isMounted) {
          setCryptoData((prevData) => {
            return prevData.map((crypto) => {
              if (updatedPrices[crypto.id]) {
                return {
                  ...crypto,
                  currentPrice: updatedPrices[crypto.id],
                  // Slightly adjust the 24h change for realism
                  priceChangePercentage24h: crypto.priceChangePercentage24h + (Math.random() * 0.2 - 0.1),
                }
              }
              return crypto
            })
          })
        }
      })
    }

    function setupMockData() {
      // Fallback to mock data if API fails
      const mockData: CryptoData[] = [
        {
          id: "bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
          currentPrice: 65432.1,
          marketCap: 1278654321098,
          totalVolume: 32165498765,
          priceChangePercentage24h: 2.5,
          sparklineIn7d: { price: generateMockSparklineData(65000, 5, 168) },
        },
        {
          id: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
          currentPrice: 3456.78,
          marketCap: 415698745632,
          totalVolume: 15698745632,
          priceChangePercentage24h: 1.8,
          sparklineIn7d: { price: generateMockSparklineData(3400, 3, 168) },
        },
        {
          id: "binancecoin",
          symbol: "BNB",
          name: "Binance Coin",
          image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
          currentPrice: 567.89,
          marketCap: 87654321098,
          totalVolume: 2345678901,
          priceChangePercentage24h: -0.7,
          sparklineIn7d: { price: generateMockSparklineData(570, 2, 168) },
        },
        {
          id: "solana",
          symbol: "SOL",
          name: "Solana",
          image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
          currentPrice: 123.45,
          marketCap: 54321098765,
          totalVolume: 3456789012,
          priceChangePercentage24h: 5.2,
          sparklineIn7d: { price: generateMockSparklineData(120, 8, 168) },
        },
        {
          id: "cardano",
          symbol: "ADA",
          name: "Cardano",
          image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
          currentPrice: 0.45,
          marketCap: 15975310642,
          totalVolume: 789456123,
          priceChangePercentage24h: -1.3,
          sparklineIn7d: { price: generateMockSparklineData(0.46, 4, 168) },
        },
        {
          id: "ripple",
          symbol: "XRP",
          name: "XRP",
          image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
          currentPrice: 0.56,
          marketCap: 29876543210,
          totalVolume: 1234567890,
          priceChangePercentage24h: 0.9,
          sparklineIn7d: { price: generateMockSparklineData(0.55, 3, 168) },
        },
        {
          id: "polkadot",
          symbol: "DOT",
          name: "Polkadot",
          image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
          currentPrice: 6.78,
          marketCap: 8765432109,
          totalVolume: 567890123,
          priceChangePercentage24h: -2.1,
          sparklineIn7d: { price: generateMockSparklineData(6.9, 5, 168) },
        },
        {
          id: "dogecoin",
          symbol: "DOGE",
          name: "Dogecoin",
          image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
          currentPrice: 0.12,
          marketCap: 16789012345,
          totalVolume: 987654321,
          priceChangePercentage24h: 3.4,
          sparklineIn7d: { price: generateMockSparklineData(0.11, 10, 168) },
        },
        {
          id: "avalanche",
          symbol: "AVAX",
          name: "Avalanche",
          image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
          currentPrice: 34.56,
          marketCap: 12345678901,
          totalVolume: 876543210,
          priceChangePercentage24h: 4.7,
          sparklineIn7d: { price: generateMockSparklineData(33, 6, 168) },
        },
        {
          id: "chainlink",
          symbol: "LINK",
          name: "Chainlink",
          image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
          currentPrice: 15.67,
          marketCap: 8901234567,
          totalVolume: 654321098,
          priceChangePercentage24h: 1.2,
          sparklineIn7d: { price: generateMockSparklineData(15.5, 4, 168) },
        },
      ]

      setCryptoData(mockData)
      setIsLoading(false)
      setIsLiveData(false)

      // Set up mock price updates
      setupMockUpdates(mockData)
    }

    // Initialize data
    initializeData()

    // Cleanup function
    return () => {
      isMounted = false

      // Clean up price updates
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      // Clear any retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
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
        const hasDetailedPrices = freshData
          .slice(0, 3)
          .some((crypto) => Math.round(crypto.currentPrice * 100) !== crypto.currentPrice * 100)

        setIsLiveData(hasDetailedPrices)
        setUsingMockData(!hasDetailedPrices)

        // Clean up any existing updates
        if (cleanupRef.current) {
          cleanupRef.current()
        }

        if (hasDetailedPrices) {
          // Set up real price updates
          cleanupRef.current = setupPriceUpdates(
            (updatedPrices) => {
              setCryptoData((prevData) => {
                return prevData.map((crypto) => {
                  if (updatedPrices[crypto.id]) {
                    return {
                      ...crypto,
                      currentPrice: updatedPrices[crypto.id],
                    }
                  }
                  return crypto
                })
              })
            },
            (updateError) => {
              console.error("Price update error:", updateError)
              setError("Live price updates unavailable. Using simulated data.")
              setIsLiveData(false)
              setUsingMockData(true)

              // Set up mock updates with our current data
              cleanupRef.current = generateMockPriceUpdates(freshData, (mockPrices) => {
                setCryptoData((prevData) => {
                  return prevData.map((crypto) => {
                    if (mockPrices[crypto.id]) {
                      return {
                        ...crypto,
                        currentPrice: mockPrices[crypto.id],
                        priceChangePercentage24h: crypto.priceChangePercentage24h + (Math.random() * 0.2 - 0.1),
                      }
                    }
                    return crypto
                  })
                })
              })
            },
          )
        } else {
          // Set up mock price updates
          setError("Using simulated price data due to API limitations.")
          cleanupRef.current = generateMockPriceUpdates(freshData, (mockPrices) => {
            setCryptoData((prevData) => {
              return prevData.map((crypto) => {
                if (mockPrices[crypto.id]) {
                  return {
                    ...crypto,
                    currentPrice: mockPrices[crypto.id],
                    priceChangePercentage24h: crypto.priceChangePercentage24h + (Math.random() * 0.2 - 0.1),
                  }
                }
                return crypto
              })
            })
          })
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

