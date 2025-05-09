"use client"

import { useState, useEffect, useRef } from "react"
import type { PortfolioItem, Transaction } from "@/types/portfolio"
import type { CryptoData } from "@/types/crypto"
import { useUser } from "@/app/context/UserContext"
import { toast } from "sonner"

// Initial portfolio with starting USD balance
const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    symbol: "USD",
    name: "US Dollar",
    amount: 10000,
    averagePrice: 1,
    transactions: [],
  },
]

// Global transaction tracking with timestamps
const transactionLog = new Map<string, { timestamp: number, processed: boolean }>();

export function usePortfolio(cryptoData: CryptoData[]) {
  const { user } = useUser();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(INITIAL_PORTFOLIO);
  const portfolioRef = useRef<PortfolioItem[]>(INITIAL_PORTFOLIO);
  const lastTransactionRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Keep portfolioRef in sync with portfolio state
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  // Cleanup old transactions periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [key, value] of transactionLog.entries()) {
        if (now - value.timestamp > 5000) { // 5 seconds
          transactionLog.delete(key);
        }
      }
    };

    const interval = setInterval(cleanup, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load portfolio from API when user changes
  useEffect(() => {
    let isMounted = true;

    async function loadPortfolio() {
      if (user) {
        try {
          const response = await fetch(`/api/portfolio?userId=${user.id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch portfolio");
          }
          const data = await response.json();
          
          // Only update if component is still mounted and we got valid data
          if (isMounted && Array.isArray(data)) {
            setPortfolio(data);
            portfolioRef.current = data;
          }
        } catch (error) {
          console.error('Error loading portfolio:', error);
          // On error, keep existing portfolio data instead of resetting
        } finally {
          setIsLoading(false);
        }
      } else {
        // Only reset to initial if there's no user
        setPortfolio(INITIAL_PORTFOLIO);
        portfolioRef.current = INITIAL_PORTFOLIO;
        setIsLoading(false);
      }
    }

    loadPortfolio();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Save to API whenever portfolio changes
  useEffect(() => {
    if (!user || isLoading) return; // Don't save if no user or still loading

    const saveData = async () => {
      try {
        const response = await fetch('/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            portfolio,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update portfolio");
        }
      } catch (error) {
        console.error('Error saving portfolio:', error);
      }
    };

    saveData();
  }, [portfolio, user, isLoading]);

  // Calculate total portfolio value (including USD and crypto assets)
  const portfolioValue = portfolio.reduce((total, item) => {
    if (item.symbol === "USD") {
      return total + item.amount;
    }
    // For crypto assets, multiply amount by current price
    const cryptoInfo = cryptoData.find((crypto: CryptoData) => crypto.symbol === item.symbol);
    if (cryptoInfo) {
      return total + (item.amount * cryptoInfo.currentPrice);
    }
    return total;
  }, 0);

  // Execute a buy or sell order
  const executeOrder = (type: "buy" | "sell", symbol: string, amount: number, price: number) => {
    if (!user?.id) return;

    const now = Date.now();
    
    // Enforce minimum time between transactions
    if (now - lastTransactionRef.current < 500) {
      return;
    }

    // Check balances before executing
    const usdBalance = portfolio.find(item => item.symbol === "USD")?.amount || 0;
    const cryptoBalance = portfolio.find(item => item.symbol === symbol)?.amount || 0;
    const totalCost = amount * price;

    if (type === "buy" && totalCost > usdBalance) {
      toast.error("Insufficient funds to complete this purchase");
      return;
    }

    if (type === "sell" && amount > cryptoBalance) {
      toast.error("Insufficient assets to complete this sale");
      return;
    }

    // Create unique transaction ID
    const transactionId = `${type}-${symbol}-${amount}-${price}-${now}`;

    // Check if this transaction was already processed
    const existingTransaction = transactionLog.get(transactionId);
    if (existingTransaction?.processed) {
      return;
    }

    // Mark transaction as being processed
    transactionLog.set(transactionId, { timestamp: now, processed: false });
    lastTransactionRef.current = now;

    try {
      const currentPortfolio = [...portfolioRef.current];
      const usdIndex = currentPortfolio.findIndex((item) => item.symbol === "USD");
      const assetIndex = currentPortfolio.findIndex((item) => item.symbol === symbol);

      // Create transaction record
      const transaction: Transaction = {
        type,
        symbol,
        amount,
        price,
        timestamp: new Date(now).toISOString(),
      };

      if (type === "buy") {
        const totalCost = amount * price;

        // Deduct USD
        currentPortfolio[usdIndex].amount -= totalCost;
        currentPortfolio[usdIndex].transactions.push(transaction);

        // Add or update the asset
        if (assetIndex === -1) {
          // New asset
          currentPortfolio.push({
            symbol,
            name: symbol,
            amount,
            averagePrice: price,
            transactions: [transaction],
          });
        } else {
          // Update existing asset
          const currentAmount = currentPortfolio[assetIndex].amount;
          const currentAvgPrice = currentPortfolio[assetIndex].averagePrice;
          const newTotalAmount = currentAmount + amount;

          // Calculate new average price
          const newAvgPrice = (currentAmount * currentAvgPrice + amount * price) / newTotalAmount;

          currentPortfolio[assetIndex].amount = newTotalAmount;
          currentPortfolio[assetIndex].averagePrice = newAvgPrice;
          currentPortfolio[assetIndex].transactions.push(transaction);
        }
      } else if (type === "sell") {
        const saleProceeds = amount * price;

        // Add USD from sale
        currentPortfolio[usdIndex].amount += saleProceeds;
        currentPortfolio[usdIndex].transactions.push(transaction);

        // Update or remove the asset
        if (currentPortfolio[assetIndex].amount === amount) {
          // If selling all, remove the asset but keep its transactions
          const assetTransactions = currentPortfolio[assetIndex].transactions;
          currentPortfolio.splice(assetIndex, 1);
          
          // If this was the last of the asset, add a record to keep transaction history
          currentPortfolio.push({
            symbol,
            name: symbol,
            amount: 0,
            averagePrice: 0,
            transactions: [...assetTransactions, transaction]
          });
        } else {
          currentPortfolio[assetIndex].amount -= amount;
          currentPortfolio[assetIndex].transactions.push(transaction);
        }
      }

      // Mark transaction as processed before updating state
      transactionLog.get(transactionId)!.processed = true;

      // Update both the ref and state atomically
      portfolioRef.current = currentPortfolio;
      setPortfolio(currentPortfolio);

    } catch (error) {
      console.error('Transaction error:', error);
      // Clean up failed transaction
      transactionLog.delete(transactionId);
    }
  };

  const resetPortfolio = async () => {
    if (user) {
      try {
        // Reset strategies first
        await fetch('/api/strategies/reset', {
          method: 'POST',
        });
        
        // Then reset portfolio
        setPortfolio(INITIAL_PORTFOLIO);
        portfolioRef.current = INITIAL_PORTFOLIO;
        
        // Save the reset portfolio
        await fetch('/api/portfolio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            portfolio: INITIAL_PORTFOLIO,
          }),
        });
      } catch (error) {
        console.error('Error resetting portfolio:', error);
      }
    }
  };

  return {
    portfolio,
    executeOrder,
    portfolioValue,
    resetPortfolio,
  };
}

