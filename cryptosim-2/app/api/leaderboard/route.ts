import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

// Function to read prices from CSV
async function getPricesFromCSV() {
  try {
    const csvPath = path.join(process.cwd(), "data/prices.csv")
    const fileContent = await fs.readFile(csvPath, 'utf-8')
    
    // Parse CSV content
    const [header, ...rows] = fileContent.split('\n')
    const prices: Record<string, number> = {}
    
    rows.forEach(row => {
      if (row) {
        const [symbol, _, price] = row.split(',')
        prices[symbol] = parseFloat(price)
      }
    })

    return prices
  } catch (err) {
    console.error("Error reading prices from CSV:", err)
    return {}
  }
}

export async function GET() {
  try {
    const portfoliosDir = path.join(process.cwd(), "data/portfolios")
    const usersDir = path.join(process.cwd(), "data/users")
    const files = await fs.readdir(portfoliosDir)
    
    // Get prices from CSV file
    const cryptoPrices = await getPricesFromCSV()
    
    // Calculate total value for each portfolio
    const portfolioValues = await Promise.all(
      files.map(async (file) => {
        const userId = path.parse(file).name
        const portfolioPath = path.join(portfoliosDir, file)
        const userPath = path.join(usersDir, `${userId}.json`)
        
        // Read portfolio data
        const portfolioData = JSON.parse(
          await fs.readFile(portfolioPath, "utf-8")
        )
        
        // Read user data to get the name
        let name = `User ${userId.slice(0, 4)}`
        try {
          const userData = JSON.parse(await fs.readFile(userPath, "utf-8"))
          name = userData.name || name
        } catch (err) {
          // Silently handle missing user files
        }

        // Calculate total value (USD + crypto holdings)
        let totalValue = 0
        
        for (const item of portfolioData) {
          if (item.symbol === "USD") {
            totalValue += item.amount
          } else {
            const price = cryptoPrices[item.symbol.toUpperCase()]
            if (price) {
                const cryptoValue = item.amount * price
                totalValue += cryptoValue
            }
          }
        }

        return {
          userId,
          totalValue,
          name
        }
      })
    )

    // Sort by total value and get top 10
    const topTen = portfolioValues
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)

    return NextResponse.json(topTen)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    )
  }
} 