import { useState, useEffect, useRef } from 'react';
import { Strategy, StrategyConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

export function useStrategyManager(
  strategy: Strategy | null,
  cryptoData: CryptoData[],
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [lastExecution, setLastExecution] = useState<Record<string, string>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    
    if (!cryptoInfo) return;

    // In a real implementation, you would:
    // 1. Fetch historical price data
    // 2. Calculate moving averages
    // 3. Generate buy/sell signals
    // For now, we'll use a simplified version
    const shortMA = cryptoInfo.currentPrice; // This should be calculated from historical data
    const longMA = cryptoInfo.currentPrice * 0.99; // This should be calculated from historical data

    if (shortMA > longMA) {
      // Buy signal
      const cryptoAmount = amount / cryptoInfo.currentPrice;
      executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    } else if (shortMA < longMA) {
      // Sell signal
      executeOrder('sell', cryptoInfo.symbol, amount, cryptoInfo.currentPrice);
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