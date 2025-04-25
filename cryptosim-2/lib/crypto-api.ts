import type { CryptoData } from "@/types/crypto"

// List of top cryptocurrencies to track
export const TOP_CRYPTO_SYMBOLS = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "ADA",
  "XRP",
  "DOGE",
  "DOT",
  "AVAX",
  "LINK",
  "MATIC",
  "LTC",
  "UNI",
  "ATOM",
]

// Interface for CoinGecko API response
interface CoinGeckoData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  total_volume: number
  price_change_percentage_24h: number
  sparkline_in_7d?: {
    price: number[]
  }
}

// Fetch cryptocurrency data from our proxy API
export async function fetchCryptoData(): Promise<CryptoData[]> {
  try {
    // Use our Next.js API route
    const response = await fetch("/api/crypto")

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    // Check if we got an error with mock data
    if (data.error && data.mockData) {
      console.warn("Using mock data due to API error:", data.error)
      return mapCoinGeckoDataToCryptoData(data.mockData)
    }

    // Map CoinGecko data to our app's data structure
    return mapCoinGeckoDataToCryptoData(data)
  } catch (error) {
    console.error("Error fetching data from API:", error)
    throw error
  }
}

// Map CoinGecko data to our app's data structure
function mapCoinGeckoDataToCryptoData(data: CoinGeckoData[]): CryptoData[] {
  return data.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image || `/placeholder.svg?height=32&width=32&text=${coin.symbol.toUpperCase()}`,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    totalVolume: coin.total_volume,
    priceChangePercentage24h: coin.price_change_percentage_24h || 0,
    sparklineIn7d: coin.sparkline_in_7d || { price: [] },
  }))
}

// Set up price updates with polling
export function setupPriceUpdates(
  onPriceUpdate: (updatedPrices: Record<string, number>) => void,
  onError: (error: any) => void,
) {
  let consecutiveErrors = 0
  const maxConsecutiveErrors = 3
  let pollInterval = 5000 // Start with 5 seconds

  const intervalId = setInterval(async () => {
    try {
      const data = await fetchCryptoData()
      const priceUpdates: Record<string, number> = {}

      data.forEach((coin) => {
        priceUpdates[coin.id] = coin.currentPrice
      })

      onPriceUpdate(priceUpdates)

      // Reset error count on success
      consecutiveErrors = 0

      // Reset poll interval if it was increased
      if (pollInterval > 5000) {
        console.log("Resetting poll interval to 5 seconds")
        clearInterval(intervalId)
        pollInterval = 5000
        setupPriceUpdates(onPriceUpdate, onError)
      }
    } catch (error) {
      consecutiveErrors++
      console.error(`Price update error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error)

      if (consecutiveErrors >= maxConsecutiveErrors) {
        // Increase polling interval to avoid rate limits
        clearInterval(intervalId)
        pollInterval = Math.min(pollInterval * 2, 30000) // Double interval up to 30 seconds max
        console.log(`Increasing poll interval to ${pollInterval / 1000} seconds due to errors`)
        setupPriceUpdates(onPriceUpdate, onError)
      }

      onError(error)
    }
  }, pollInterval)

  // Return a cleanup function
  return () => clearInterval(intervalId)
}

// Generate mock price updates for testing
export function generateMockPriceUpdates(
  baseData: CryptoData[],
  onPriceUpdate: (updatedPrices: Record<string, number>) => void,
) {
  const intervalId = setInterval(() => {
    const priceUpdates: Record<string, number> = {}

    baseData.forEach((crypto) => {
      // Random price change between -0.5% and +0.5%
      const changePercent = (Math.random() * 2 - 1) * 0.5
      const newPrice = crypto.currentPrice * (1 + changePercent / 100)
      priceUpdates[crypto.id] = newPrice
    })

    onPriceUpdate(priceUpdates)
  }, 1000) // Update every second

  return () => clearInterval(intervalId)
}

