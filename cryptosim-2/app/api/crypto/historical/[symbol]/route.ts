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

export async function GET(
  req: Request,
  context: { params: { symbol: string } }
) {
  try {
    // Await the params object
    const params = await Promise.resolve(context.params);
    const { symbol } = params;
    
    const searchParams = new URL(req.url).searchParams
    const timeRange = searchParams.get("timeRange") || "1D"

    // Check cache with timeRange
    const cachedData = await getCachedData(symbol, timeRange)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get latest quote from CoinMarketCap
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

    // Find the correct cryptocurrency by ID
    const cryptoId = CRYPTO_IDS[symbol.toUpperCase() as keyof typeof CRYPTO_IDS]
    const mainCrypto = cryptoData.find(crypto => crypto.id === cryptoId)
    
    if (!mainCrypto || !mainCrypto.quote?.USD) {
      throw new Error(`No data found for ${symbol.toUpperCase()}`)
    }

    const currentPrice = mainCrypto.quote.USD.price
    const percentChange = {
      "1h": mainCrypto.quote.USD.percent_change_1h || 0,
      "24h": mainCrypto.quote.USD.percent_change_24h || 0,
      "7d": mainCrypto.quote.USD.percent_change_7d || 0,
      "30d": mainCrypto.quote.USD.percent_change_30d || 0,
      "60d": mainCrypto.quote.USD.percent_change_60d || 0,
      "90d": mainCrypto.quote.USD.percent_change_90d || 0
    }

    // Generate synthetic historical data based on percent changes
    const now = Date.now()
    let dataPoints: { timestamp: number; price: number }[] = []
    
    switch (timeRange) {
      case "1D": {
        // Generate points every 15 minutes (96 points for 24 hours)
        const points = 96;
        const minutesPerPoint = 15;
        const baseChange = percentChange["24h"] / points;
        
        for (let i = points; i >= 0; i--) {
          const timestamp = now - (i * minutesPerPoint * 60 * 1000);
          
          // Create more realistic price movements
          const randomVolatility = Math.random() * 0.15 + 0.05; // 5-20% volatility factor
          const noise = (Math.random() - 0.5) * baseChange * randomVolatility;
          const trendComponent = ((points - i) * baseChange / 100);
          const volatilityComponent = noise * currentPrice / 100;
          
          const priceAtPoint = (currentPrice / (1 + (percentChange["24h"] / 100))) * 
            (1 + trendComponent + volatilityComponent);
          
          dataPoints.push({ 
            timestamp,
            price: Math.max(priceAtPoint, 0) // Ensure price doesn't go negative
          });
        }
        break;
      }
      case "1W": {
        // Generate points every hour (168 points for 7 days)
        const points = 168;
        const hoursPerPoint = 1;
        const baseChange = percentChange["7d"] / points;
        
        for (let i = points; i >= 0; i--) {
          const timestamp = now - (i * hoursPerPoint * 60 * 60 * 1000);
          
          // Create more realistic price movements
          const randomVolatility = Math.random() * 0.2 + 0.1; // 10-30% volatility factor
          const noise = (Math.random() - 0.5) * baseChange * randomVolatility;
          const trendComponent = ((points - i) * baseChange / 100);
          const volatilityComponent = noise * currentPrice / 100;
          
          // Add some occasional larger moves
          const spike = Math.random() > 0.95 ? (Math.random() - 0.5) * 0.5 : 0; // 5% chance of price spike
          
          const priceAtPoint = (currentPrice / (1 + (percentChange["7d"] / 100))) * 
            (1 + trendComponent + volatilityComponent + spike);
          
          dataPoints.push({ 
            timestamp,
            price: Math.max(priceAtPoint, 0)
          });
        }
        break;
      }
      case "1M": {
        const dailyChange = percentChange["30d"] / 30
        for (let i = 30; i >= 0; i--) {
          const timestamp = now - (i * 24 * 60 * 60 * 1000)
          const priceAtPoint = currentPrice / (1 + (percentChange["30d"] / 100)) * (1 + ((30 - i) * dailyChange / 100))
          dataPoints.push({ timestamp, price: priceAtPoint })
        }
        break
      }
      case "1Y": {
        const dailyChange = percentChange["90d"] / 90
        for (let i = 90; i >= 0; i--) {
          const timestamp = now - (i * 24 * 60 * 60 * 1000)
          const priceAtPoint = currentPrice / (1 + (percentChange["90d"] / 100)) * (1 + ((90 - i) * dailyChange / 100))
          dataPoints.push({ timestamp, price: priceAtPoint })
        }
        break
      }
    }

    // Ensure the last point matches current price exactly
    dataPoints[dataPoints.length - 1] = {
      timestamp: now,
      price: currentPrice
    }

    // Cache the data with timeRange
    await setCachedData(symbol, timeRange, dataPoints)

    return NextResponse.json(dataPoints)
  } catch (error: any) {
    console.error("Error fetching data:", error.message)
    if (error.response) {
      console.error("API Response:", error.response.data)
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch price data" },
      { status: 500 }
    )
  }
} 