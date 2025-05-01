import { NextResponse } from "next/server"
import axios from "axios"
import { getCachedData, setCachedData } from "@/lib/cache"

const COINMARKETCAP_API_KEY = "d1166654-2fa8-4d0e-86be-dd4c189093d8"

// Map of major crypto IDs on CoinMarketCap
const CRYPTO_IDS = {
  'BTC': 1,
  'ETH': 1027,
  'USDT': 825,
  'BNB': 1839,
  'SOL': 5426,
  // Add more as needed
}

// Base prices for mock data
const BASE_PRICES = {
  'BTC': 65000,
  'ETH': 3500,
  'USDT': 1,
  'BNB': 300,
  'SOL': 100,
}

function generateHistoricalPrices(basePrice: number, timeRange: string, dataPoints: number) {
  const prices = []
  let currentPrice = basePrice
  const volatility = 0.02 // 2% daily volatility
  const trend = 0.0001 // Slight upward trend
  
  for (let i = 0; i < dataPoints; i++) {
    // Random walk with trend and volatility scaling
    const randomChange = (Math.random() - 0.5) * volatility
    const trendChange = trend
    currentPrice = currentPrice * (1 + randomChange + trendChange)
    
    // Add some mean reversion to prevent extreme values
    const deviation = (currentPrice - basePrice) / basePrice
    const meanReversion = -deviation * 0.1
    currentPrice = currentPrice * (1 + meanReversion)
    
    // Ensure price stays within realistic bounds
    const minPrice = basePrice * 0.5
    const maxPrice = basePrice * 1.5
    currentPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice))
    
    prices.push({
      timestamp: Date.now() - (dataPoints - i) * getTimeInterval(timeRange),
      price: currentPrice
    })
  }
  
  return prices
}

function getTimeInterval(timeRange: string): number {
  switch (timeRange) {
    case '1D':
      return 15 * 60 * 1000 // 15 minutes
    case '1W':
      return 60 * 60 * 1000 // 1 hour
    case '1M':
      return 6 * 60 * 60 * 1000 // 6 hours
    case '1Y':
      return 24 * 60 * 60 * 1000 // 1 day
    default:
      return 60 * 60 * 1000 // 1 hour
  }
}

function getDataPoints(timeRange: string): number {
  switch (timeRange) {
    case '1D':
      return 96 // 15-minute intervals
    case '1W':
      return 168 // 1-hour intervals
    case '1M':
      return 120 // 6-hour intervals
    case '1Y':
      return 365 // Daily intervals
    default:
      return 168
  }
}

export async function GET(
  req: Request,
  context: { params: { symbol: string } }
) {
  try {
    const params = await Promise.resolve(context.params)
    const { symbol } = params
    const searchParams = new URL(req.url).searchParams
    const timeRange = searchParams.get("timeRange") || "1D"

    // Check cache
    const cachedData = await getCachedData(symbol, timeRange)
    if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minute cache
      return NextResponse.json(cachedData.data)
    }

    try {
      // Try to get real data from CoinMarketCap
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest",
      {
        headers: {
          "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
          "Accept": "application/json"
        },
        params: {
          symbol: symbol.toUpperCase(),
          convert: "USD"
        }
      }
    )

    const cryptoData = response.data.data[symbol.toUpperCase()]
    if (!Array.isArray(cryptoData)) {
      throw new Error('Invalid API response format')
    }

    const cryptoId = CRYPTO_IDS[symbol.toUpperCase() as keyof typeof CRYPTO_IDS]
    const mainCrypto = cryptoData.find(crypto => crypto.id === cryptoId)
    
      if (mainCrypto?.quote?.USD?.price) {
        const basePrice = mainCrypto.quote.USD.price
        const historicalData = generateHistoricalPrices(basePrice, timeRange, getDataPoints(timeRange))
        
        // Cache the data
        await setCachedData(symbol, timeRange, {
          timestamp: Date.now(),
          data: historicalData
        })
        
        return NextResponse.json(historicalData)
      }
    } catch (error) {
      console.warn('Failed to fetch real price data, falling back to mock data:', error)
    }
    
    // Fallback to mock data
    const basePrice = BASE_PRICES[symbol.toUpperCase() as keyof typeof BASE_PRICES] || 100
    const historicalData = generateHistoricalPrices(basePrice, timeRange, getDataPoints(timeRange))
    
    // Cache the mock data
    await setCachedData(symbol, timeRange, {
      timestamp: Date.now(),
      data: historicalData
    })

    return NextResponse.json(historicalData)
    
  } catch (error) {
    console.error('Error in historical price route:', error)
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
} 