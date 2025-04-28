import { NextResponse } from "next/server"
import axios from "axios"
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

export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if it's still valid
    if (cachedData && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedData)
    }

    // Fetch new data from CoinMarketCap
    const response = await axios.get(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=10&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY!,
          "Accept": "application/json",
        },
      }
    )

    // Log success
    console.log("Successful API fetch from CoinMarketCap")

    // Map CoinMarketCap data to your app's structure
    const mappedData = mapCoinMarketCapToAppData(response.data)

    // Update cache
    cachedData = mappedData
    cacheTime = now

    // Set cache headers for 5 minutes
    return NextResponse.json(mappedData, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching data from CoinMarketCap:", error)

    // If we have cached data, return it even if it's expired
    if (cachedData) {
      console.log("Returning stale cached data due to API error")
      return NextResponse.json(cachedData)
    }

    return NextResponse.json(
      { error: "Failed to fetch cryptocurrency data" },
      { status: 500 }
    )
  }
}

