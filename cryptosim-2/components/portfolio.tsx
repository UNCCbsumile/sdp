"use client"
// Import UI components and types
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import type { CryptoData } from "@/types/crypto"
import type { PortfolioItem } from "@/types/portfolio"
import { formatCurrency } from "@/lib/utils"

// Props for the Portfolio component
interface PortfolioProps {
  portfolio: PortfolioItem[]
  cryptoData: CryptoData[]
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
  resetPortfolio?: () => void
}

// Main Portfolio component: shows balances, holdings, and transaction history
export default function Portfolio({ portfolio, cryptoData, executeOrder, resetPortfolio }: PortfolioProps) {
  // Handle reset without page refresh
  const handleReset = () => {
    if (resetPortfolio) {
      resetPortfolio();
    }
  };

  // Calculate portfolio items with current values and profit/loss
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

  // Filter out USD and zero balance items for active crypto holdings
  const activePortfolio = portfolioWithValues.filter((item) => item.amount > 0 && item.symbol !== "USD")
  // Get available USD balance
  const usdBalance = portfolioWithValues.find((item) => item.symbol === "USD")?.amount || 0

  // Calculate total value of crypto holdings (excluding USD)
  const totalValue = activePortfolio.reduce((sum, item) => sum + item.currentValue, 0)

  return (
    <div className="space-y-4">
      {/* Card showing available USD balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Available Balance</CardTitle>
            <CardDescription>Your available funds for trading</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Reset Simulation</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you wish to reset? All account data will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Yes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(usdBalance)}</div>
        </CardContent>
      </Card>

      {/* Card showing crypto holdings and their performance */}
      <Card>
        <CardHeader>
          <CardTitle>Crypto Holdings</CardTitle>
          <CardDescription>Track your cryptocurrency holdings and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-4">Total Value: {formatCurrency(totalValue)}</div>

          {activePortfolio.length > 0 ? (
            // Table of active crypto holdings
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
                {/* Render each holding as a table row */}
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
                      {/* Button to sell all of this asset */}
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
            // Message if no crypto holdings
            <div className="text-center py-8 text-muted-foreground">
              Your portfolio is empty. Start trading to see your holdings here.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card showing recent transaction history */}
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
              {/* 
                Flatten all transactions from all portfolio items,
                sort them by most recent,
                deduplicate similar transactions within 1 second,
                and show the 10 most recent.
              */}
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
                    {/* Show transaction date/time */}
                    <TableCell>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
                    {/* Show buy/sell type with color */}
                    <TableCell className={transaction.type === "buy" ? "text-green-500" : "text-red-500"}>
                      {transaction.type.toUpperCase()}
                    </TableCell>
                    {/* Show asset symbol */}
                    <TableCell>{transaction.symbol}</TableCell>
                    {/* Show amount, price, and total value */}
                    <TableCell className="text-right">
                      {typeof transaction.amount === 'number' 
                        ? transaction.amount.toFixed(8) 
                        : '0.00000000'
                      }
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.amount * transaction.price)}
                    </TableCell>
                  </TableRow>
                ))}
              {/* Show message if there are no transactions */}
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

