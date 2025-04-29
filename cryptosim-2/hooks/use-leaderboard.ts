"use client"

import { useState, useEffect } from "react"
import { PortfolioItem } from "@/types/portfolio"
import { CryptoData } from "@/types/crypto"

interface LeaderboardEntry {
  userId: string
  totalValue: number
  name: string
}

export function useLeaderboard(cryptoData: CryptoData[]) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard')
        if (!response.ok) throw new Error('Failed to fetch leaderboard')
        const data = await response.json()
        
        const transformedData = data.map((entry: any) => ({
          userId: entry.userId,
          totalValue: entry.totalValue,
          name: entry.name || 'Unknown User'
        }))
        
        setLeaderboard(transformedData)
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load leaderboard data')
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
    // Refresh every minute
    const interval = setInterval(fetchLeaderboard, 60000)
    return () => clearInterval(interval)
  }, [cryptoData])

  return { leaderboard, isLoading, error }
} 