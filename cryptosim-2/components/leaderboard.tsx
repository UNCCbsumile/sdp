import { useLeaderboard } from "@/hooks/use-leaderboard"
import { useCryptoData } from "@/hooks/use-crypto-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export function Leaderboard() {
  const { cryptoData } = useCryptoData()
  const { leaderboard, isLoading, error } = useLeaderboard(cryptoData)

  if (error) {
    return (
      <Card className="border-0">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle>Top Traders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Portfolio Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : (
              leaderboard.map((entry, index) => (
                <TableRow key={entry.userId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{entry.name}</TableCell>
                  <TableCell className="text-right">
                    ${entry.totalValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 