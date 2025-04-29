import { NextResponse } from "next/server"
import axios from "axios"
import fs from "fs"
import path from "path"
//const COINMARKETCAP_API_KEY = ""
const COINMARKETCAP_API_KEY = "d1166654-2fa8-4d0e-86be-dd4c189093d8" 
// In-memory cache
let cachedData: any = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Helper to map CoinMarketCap data to your app's structure
function mapCoinMarketCapToAppData(data: any) {
  // data.data is the array of coins from CoinMarketCap
  return data.data.map((coin: any) => ({
    id: coin.id.toString(),
    symbol: coin.symbol.toLowerCase(),
    name: coin.name,
    image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
    current_price: coin.quote.USD.price,
    market_cap: coin.quote.USD.market_cap,
    total_volume: coin.quote.USD.volume_24h,
    price_change_percentage_24h: coin.quote.USD.percent_change_24h,
    // No sparkline in CMC, so we provide an empty array or generate mock data if needed
    sparkline_in_7d: { price: [] },
  }))
}

// Helper to save prices to CSV
function savePricesToCSV(data: any[]) {
  const csvPath = path.join(process.cwd(), "data/prices.csv")
  
  // Create CSV header and data
  const headers = ["symbol", "name", "currentPrice", "timestamp"]
  const timestamp = new Date().toISOString()
  
  const csvRows = [
    headers.join(","), // Header row
    ...data.map(coin => [
      coin.symbol.toUpperCase(),
      coin.name.replace(",", ""), // Remove commas from names to avoid CSV issues
      coin.current_price,
      timestamp
    ].join(","))
  ]

  // Write to file
  fs.writeFileSync(csvPath, csvRows.join("\n"))
}

export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if it's still valid
    if (cachedData && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedData)
    }

    // If no API key, use mock data
    if (!COINMARKETCAP_API_KEY) {
      const mockData = [
        {
          id: "bitcoin",
          symbol: "BTC",
          name: "Bitcoin",
          currentPrice: 65432.1,
        },
        {
          id: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          currentPrice: 3456.78,
        },
        // ... other mock data ...
      ]
      
      // Save mock prices to CSV
      savePricesToCSV(mockData)
      return NextResponse.json(mockData)
    }

    // Fetch real data from CoinMarketCap
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=10&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
          "Accept": "application/json",
        },
      }
    )

    const mappedData = mapCoinMarketCapToAppData(response.data)
    
    // Save real prices to CSV
    savePricesToCSV(mappedData)
    
    cachedData = mappedData
    cacheTime = now

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error("Error fetching data from CoinMarketCap:", error)
    return NextResponse.json(
      { error: "Failed to fetch cryptocurrency data" },
      { status: 500 }
    )
  }
}

