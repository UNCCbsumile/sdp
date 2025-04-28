import { useState, useEffect, useRef } from 'react';
import { Strategy, StrategyConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Helper function to calculate moving average
const calculateMovingAverage = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

export function useStrategyManager(
  strategy: Strategy | null,
  cryptoData: CryptoData[],
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [lastExecution, setLastExecution] = useState<Record<string, string>>({});
  const [isClient, setIsClient] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update price history when crypto data changes
  useEffect(() => {
    if (!cryptoData.length) return;

    setPriceHistory(prev => {
      const newHistory = { ...prev };
      cryptoData.forEach(crypto => {
        if (!newHistory[crypto.id]) {
          newHistory[crypto.id] = [];
        }
        // Add current price to history
        newHistory[crypto.id].push(crypto.currentPrice);
        // Keep only the last 100 prices to limit memory usage
        if (newHistory[crypto.id].length > 100) {
          newHistory[crypto.id] = newHistory[crypto.id].slice(-100);
        }
      });
      return newHistory;
    });
  }, [cryptoData]);

  // DCA Strategy Implementation
  const executeDCAStrategy = (config: StrategyConfig & { type: 'DCA' }) => {
    if (!isClient) return;
    
    const { symbol, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;
    
    const cryptoAmount = amount / cryptoInfo.currentPrice;
    executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    setLastExecution(prev => ({ ...prev, [strategy!.id]: new Date().toISOString() }));
  };

  // Moving Average Strategy Implementation
  const executeMAStrategy = (config: StrategyConfig & { type: 'MOVING_AVERAGE' }) => {
    if (!isClient) return;
    
    const { symbol, shortPeriod, longPeriod, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo || !priceHistory[symbol] || priceHistory[symbol].length < longPeriod) return;

    // Calculate actual moving averages
    const shortMA = calculateMovingAverage(priceHistory[symbol], shortPeriod);
    const longMA = calculateMovingAverage(priceHistory[symbol], longPeriod);

    // Get previous values for trend analysis
    const prevShortMA = calculateMovingAverage(priceHistory[symbol].slice(0, -1), shortPeriod);
    const prevLongMA = calculateMovingAverage(priceHistory[symbol].slice(0, -1), longPeriod);

    // Generate signals based on crossover
    if (shortMA > longMA && prevShortMA <= prevLongMA) {
      // Buy signal: short MA crosses above long MA
      const cryptoAmount = amount / cryptoInfo.currentPrice;
      executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    } else if (shortMA < longMA && prevShortMA >= prevLongMA) {
      // Sell signal: short MA crosses below long MA
      const cryptoAmount = amount / cryptoInfo.currentPrice;
      executeOrder('sell', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    }
    
    setLastExecution(prev => ({ ...prev, [strategy!.id]: new Date().toISOString() }));
  };

  // Grid Trading Strategy Implementation
  const executeGridStrategy = (config: StrategyConfig & { type: 'GRID' }) => {
    const { symbol, upperLimit, lowerLimit, gridLines, investmentPerGrid } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;

    const currentPrice = cryptoInfo.currentPrice;
    const gridSize = (upperLimit - lowerLimit) / gridLines;
    
    // Calculate grid levels
    const levels = Array.from({ length: gridLines + 1 }, (_, i) => lowerLimit + (i * gridSize));
    
    // Find nearest grid levels
    const nearestLower = levels.reverse().find(level => level < currentPrice);
    const nearestUpper = levels.reverse().find(level => level > currentPrice);
    
    if (nearestLower && currentPrice < nearestLower * 1.02) {
      // Buy at support level
      const cryptoAmount = investmentPerGrid / currentPrice;
      executeOrder('buy', cryptoInfo.symbol, cryptoAmount, currentPrice);
    } else if (nearestUpper && currentPrice > nearestUpper * 0.98) {
      // Sell at resistance level
      const cryptoAmount = investmentPerGrid / currentPrice;
      executeOrder('sell', cryptoInfo.symbol, cryptoAmount, currentPrice);
    }
    
    setLastExecution(prev => ({ ...prev, [strategy!.id]: new Date().toISOString() }));
  };

  useEffect(() => {
    if (!strategy?.config.enabled || !cryptoData.length) return;

    const executeStrategy = () => {
      switch (strategy.config.type) {
        case 'DCA':
          executeDCAStrategy(strategy.config);
          break;
        case 'MOVING_AVERAGE':
          executeMAStrategy(strategy.config);
          break;
        case 'GRID':
          executeGridStrategy(strategy.config);
          break;
        // Add other strategy executions here
      }
    };

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set new interval based on strategy type
    const interval = strategy.config.type === 'DCA'
      ? strategy.config.interval * 60 * 60 * 1000 // Convert hours to ms
      : 5 * 60 * 1000; // 5 minutes for other strategies

    intervalRef.current = setInterval(executeStrategy, interval);

    // Initial execution if needed
    const lastExec = lastExecution[strategy.id];
    if (!lastExec || Date.now() - new Date(lastExec).getTime() >= interval) {
      executeStrategy();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [strategy, cryptoData, executeOrder]);

  return {
    lastExecution,
  };
}