import type { CryptoData } from "@/types/crypto"

// WebSocket URL (we'll use a public WebSocket service that allows browser connections)
const BINANCE_WEBSOCKET_BASE = "wss://stream.binance.com:9443/ws"

// List of top cryptocurrencies to track (symbol pairs with USDT)
export const TOP_CRYPTO_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "DOTUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "MATICUSDT",
  "LTCUSDT",
  "UNIUSDT",
  "ATOMUSDT",
]

// Map Binance symbols to more readable names
export const SYMBOL_NAME_MAP: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  BNBUSDT: "Binance Coin",
  SOLUSDT: "Solana",
  ADAUSDT: "Cardano",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  DOTUSDT: "Polkadot",
  AVAXUSDT: "Avalanche",
  LINKUSDT: "Chainlink",
  MATICUSDT: "Polygon",
  LTCUSDT: "Litecoin",
  UNIUSDT: "Uniswap",
  ATOMUSDT: "Cosmos",
}

// Interface for Binance ticker data
interface BinanceTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  lastQty: string
  bidPrice: string
  bidQty: string
  askPrice: string
  askQty: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  firstId: number
  lastId: number
  count: number
}

// Interface for Binance WebSocket ticker data
interface BinanceWebSocketTicker {
  e: string // Event type
  E: number // Event time
  s: string // Symbol
  p: string // Price change
  P: string // Price change percent
  w: string // Weighted average price
  c: string // Last price
  Q: string // Last quantity
  o: string // Open price
  h: string // High price
  l: string // Low price
  v: string // Total traded base asset volume
  q: string // Total traded quote asset volume
  O: number // Statistics open time
  C: number // Statistics close time
  F: number // First trade ID
  L: number // Last trade ID
  n: number // Total number of trades
}

// Fetch initial cryptocurrency data from our proxy API
export async function fetchInitialCryptoData(): Promise<CryptoData[]> {
  try {
    // Use our Next.js API route instead of calling Binance directly
    const response = await fetch("/api/crypto")

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: BinanceTicker[] = await response.json()

    // Filter for our selected symbols and map to our app's data structure
    return data
      .filter((ticker) => TOP_CRYPTO_SYMBOLS.includes(ticker.symbol))
      .map((ticker) => mapBinanceTickerToCryptoData(ticker))
  } catch (error) {
    console.error("Error fetching data from API:", error)
    throw error
  }
}

// Create a WebSocket connection for real-time updates
export function createWebSocketConnection(
  onPriceUpdate: (data: CryptoData) => void,
  onError: (error: Event) => void,
): WebSocket | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    // For individual symbol streams
    const streams = TOP_CRYPTO_SYMBOLS.map((symbol) => `${symbol.toLowerCase()}@ticker`).join("/")

    const ws = new WebSocket(`${BINANCE_WEBSOCKET_BASE}/stream?streams=${streams}`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const ticker = data.data as BinanceWebSocketTicker

        // Map the WebSocket data to our app's data structure
        const cryptoData = mapBinanceWSTickerToCryptoData(ticker)
        onPriceUpdate(cryptoData)
      } catch (err) {
        console.error("Error processing WebSocket message:", err)
      }
    }

    ws.onerror = onError

    return ws
  } catch (error) {
    console.error("Error creating WebSocket connection:", error)
    return null
  }
}

// Map Binance REST API ticker data to our app's data structure
function mapBinanceTickerToCryptoData(ticker: BinanceTicker): CryptoData {
  const symbol = ticker.symbol.replace("USDT", "")

  return {
    id: symbol.toLowerCase(),
    symbol: symbol,
    name: SYMBOL_NAME_MAP[ticker.symbol] || symbol,
    image: `/placeholder.svg?height=32&width=32&text=${symbol}`,
    currentPrice: Number.parseFloat(ticker.lastPrice),
    marketCap: Number.parseFloat(ticker.quoteVolume) * 10, // Approximation
    totalVolume: Number.parseFloat(ticker.quoteVolume),
    priceChangePercentage24h: Number.parseFloat(ticker.priceChangePercent),
    sparklineIn7d: { price: [] },
  }
}

// Map Binance WebSocket ticker data to our app's data structure
function mapBinanceWSTickerToCryptoData(ticker: BinanceWebSocketTicker): CryptoData {
  const symbol = ticker.s.replace("USDT", "")

  return {
    id: symbol.toLowerCase(),
    symbol: symbol,
    name: SYMBOL_NAME_MAP[ticker.s] || symbol,
    image: `/placeholder.svg?height=32&width=32&text=${symbol}`,
    currentPrice: Number.parseFloat(ticker.c),
    marketCap: Number.parseFloat(ticker.q) * 10, // Approximation
    totalVolume: Number.parseFloat(ticker.q),
    priceChangePercentage24h: Number.parseFloat(ticker.P),
    sparklineIn7d: { price: [] },
  }
}