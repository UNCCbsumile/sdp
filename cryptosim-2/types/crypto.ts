export interface CryptoData {
  id: string
  symbol: string
  name: string
  image: string
  currentPrice: number
  marketCap: number
  totalVolume: number
  priceChangePercentage24h: number
  sparklineIn7d: {
    price: number[]
  }
}

