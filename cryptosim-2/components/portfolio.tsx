"use client"
//all imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { CryptoData } from "@/types/crypto"
import type { PortfolioItem } from "@/types/portfolio"
import { formatCurrency } from "@/lib/utils"

interface PortfolioProps {
  portfolio: PortfolioItem[]
  cryptoData: CryptoData[]
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
}

export default function Portfolio({ portfolio, cryptoData, executeOrder }: PortfolioProps) {
  // Calculate portfolio items with current values
  const portfolioWithValues = portfolio.map((item) => {
    const cryptoInfo = cryptoData.find((crypto) => crypto.symbol === item.symbol)
    const currentPrice = cryptoInfo?.currentPrice || 0
    const currentValue = item.amount * currentPrice
    const profitLoss = currentValue - item.amount * item.averagePrice
    const profitLossPercentage =
      item.averagePrice > 0 ? ((currentPrice - item.averagePrice) / item.averagePrice) * 100 : 0

    return {
      ...item,
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPercentage,
    }
  })

  // Filter out USD and zero balance items
  const activePortfolio = portfolioWithValues.filter((item) => item.amount > 0 && item.symbol !== "USD")
  const usdBalance = portfolioWithValues.find((item) => item.symbol === "USD")?.amount || 0

  // Calculate total portfolio value (excluding USD)
  const totalValue = activePortfolio.reduce((sum, item) => sum + item.currentValue, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Available Balance</CardTitle>
          <CardDescription>Your available funds for trading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(usdBalance)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crypto Holdings</CardTitle>
          <CardDescription>Track your cryptocurrency holdings and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-4">Total Value: {formatCurrency(totalValue)}</div>

          {activePortfolio.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Avg. Buy Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Profit/Loss</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePortfolio.map((item) => (
                  <TableRow key={item.symbol}>
                    <TableCell className="font-medium">{item.symbol}</TableCell>
                    <TableCell className="text-right">{item.amount.toFixed(8)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.averagePrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.currentPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.currentValue)}</TableCell>
                    <TableCell className={`text-right ${item.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatCurrency(item.profitLoss)} ({item.profitLossPercentage.toFixed(2)}%)
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeOrder("sell", item.symbol, item.amount, item.currentPrice)}
                      >
                        Sell All
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Your portfolio is empty. Start trading to see your holdings here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio
                .flatMap((item) => item.transactions)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                // Deduplicate transactions by comparing all properties except timestamp
                .filter((transaction, index, self) => 
                  index === self.findIndex((t) => (
                    t.type === transaction.type &&
                    t.symbol === transaction.symbol &&
                    t.amount === transaction.amount &&
                    t.price === transaction.price &&
                    // Only consider transactions within 1 second of each other as duplicates
                    Math.abs(new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime()) < 1000
                  ))
                )
                .slice(0, 10)
                .map((transaction, index) => (
                  <TableRow key={`${transaction.type}-${transaction.symbol}-${transaction.amount}-${transaction.price}-${transaction.timestamp}-${index}`}>
                    <TableCell>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
                    <TableCell className={transaction.type === "buy" ? "text-green-500" : "text-red-500"}>
                      {transaction.type.toUpperCase()}
                    </TableCell>
                    <TableCell>{transaction.symbol}</TableCell>
                    <TableCell className="text-right">{transaction.amount.toFixed(8)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.amount * transaction.price)}
                    </TableCell>
                  </TableRow>
                ))}
              {portfolio.flatMap((item) => item.transactions).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No transactions yet. Start trading to see your history.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

