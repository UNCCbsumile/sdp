export interface Transaction {
  type: "buy" | "sell"
  symbol: string
  amount: number
  price: number
  timestamp: string
}

export interface PortfolioItem {
  symbol: string
  name: string
  amount: number
  averagePrice: number
  transactions: Transaction[]
}

