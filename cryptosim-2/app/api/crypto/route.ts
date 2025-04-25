import { NextResponse } from "next/server"

// CoinGecko API base URL
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3"

// In-memory cache
let cachedData: any = null
let cacheTime = 0
const CACHE_DURATION = 10 * 1000 // 10 seconds in milliseconds

export async function GET() {
  try {
    const now = Date.now()

    // Return cached data if it's still valid
    if (cachedData && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedData)
    }

    // Fetch new data from CoinGecko
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`,
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 10 }, // Cache for 10 seconds
      },
    )

    if (!response.ok) {
      // If we get a 429, throw a specific error
      if (response.status === 429) {
        throw new Error("RATE_LIMITED")
      }
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    // Update cache
    cachedData = data
    cacheTime = now

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching data from CoinGecko:", error)

    // If we have cached data, return it even if it's expired
    if (cachedData) {
      console.log("Returning stale cached data due to API error")
      return NextResponse.json(cachedData)
    }

    // If it's a rate limit error and we have no cache, return mock data
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      console.log("Rate limited by CoinGecko API, returning mock data")
      return NextResponse.json(getMockCryptoData())
    }

    return NextResponse.json(
      { error: "Failed to fetch cryptocurrency data", mockData: getMockCryptoData() },
      { status: 500 },
    )
  }
}

// Mock data function for fallback
function getMockCryptoData() {
  return [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      current_price: 65432.1,
      market_cap: 1278654321098,
      total_volume: 32165498765,
      price_change_percentage_24h: 2.5,
      sparkline_in_7d: { price: generateMockSparkline(65000, 5) },
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      current_price: 3456.78,
      market_cap: 415698745632,
      total_volume: 15698745632,
      price_change_percentage_24h: 1.8,
      sparkline_in_7d: { price: generateMockSparkline(3400, 3) },
    },
    {
      id: "binancecoin",
      symbol: "bnb",
      name: "Binance Coin",
      image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
      current_price: 567.89,
      market_cap: 87654321098,
      total_volume: 2345678901,
      price_change_percentage_24h: -0.7,
      sparkline_in_7d: { price: generateMockSparkline(570, 2) },
    },
    {
      id: "solana",
      symbol: "sol",
      name: "Solana",
      image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      current_price: 123.45,
      market_cap: 54321098765,
      total_volume: 3456789012,
      price_change_percentage_24h: 5.2,
      sparkline_in_7d: { price: generateMockSparkline(120, 8) },
    },
    {
      id: "cardano",
      symbol: "ada",
      name: "Cardano",
      image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
      current_price: 0.45,
      market_cap: 15975310642,
      total_volume: 789456123,
      price_change_percentage_24h: -1.3,
      sparkline_in_7d: { price: generateMockSparkline(0.46, 4) },
    },
    {
      id: "ripple",
      symbol: "xrp",
      name: "XRP",
      image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
      current_price: 0.56,
      market_cap: 29876543210,
      total_volume: 1234567890,
      price_change_percentage_24h: 0.9,
      sparkline_in_7d: { price: generateMockSparkline(0.55, 3) },
    },
    {
      id: "polkadot",
      symbol: "dot",
      name: "Polkadot",
      image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
      current_price: 6.78,
      market_cap: 8765432109,
      total_volume: 567890123,
      price_change_percentage_24h: -2.1,
      sparkline_in_7d: { price: generateMockSparkline(6.9, 5) },
    },
    {
      id: "dogecoin",
      symbol: "doge",
      name: "Dogecoin",
      image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
      current_price: 0.12,
      market_cap: 16789012345,
      total_volume: 987654321,
      price_change_percentage_24h: 3.4,
      sparkline_in_7d: { price: generateMockSparkline(0.11, 10) },
    },
    {
      id: "avalanche",
      symbol: "avax",
      name: "Avalanche",
      image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
      current_price: 34.56,
      market_cap: 12345678901,
      total_volume: 876543210,
      price_change_percentage_24h: 4.7,
      sparkline_in_7d: { price: generateMockSparkline(33, 6) },
    },
    {
      id: "chainlink",
      symbol: "link",
      name: "Chainlink",
      image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
      current_price: 15.67,
      market_cap: 8901234567,
      total_volume: 654321098,
      price_change_percentage_24h: 1.2,
      sparkline_in_7d: { price: generateMockSparkline(15.5, 4) },
    },
  ]
}

// Generate mock sparkline data
function generateMockSparkline(basePrice: number, volatilityPercent: number) {
  const dataPoints = 168 // 7 days hourly data
  const result = []
  let price = basePrice

  for (let i = 0; i < dataPoints; i++) {
    // Random walk with mean reversion
    const changePercent = ((Math.random() * 2 - 1) * volatilityPercent) / 100
    price = price * (1 + changePercent)

    // Mean reversion
    price = price * 0.99 + basePrice * 0.01

    result.push(price)
  }

  return result
}

