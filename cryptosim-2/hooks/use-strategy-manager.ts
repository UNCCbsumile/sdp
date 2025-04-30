import { useState, useEffect, useRef, useCallback } from 'react';
import { Strategy, StrategyConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Create a global store for last execution times that persists across refreshes
const STORAGE_KEY = 'strategy_execution_times';
const getStoredExecutionTimes = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const stored = window.localStorage.getItem(STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

const saveExecutionTimes = (times: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
};

export function useStrategyManager(
  strategy: Strategy | null,
  cryptoData: CryptoData[],
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [lastExecution, setLastExecution] = useState<Record<string, string>>(getStoredExecutionTimes());
  const lastExecutionTimeRef = useRef<Record<string, number>>({});

  // Initialize lastExecutionTimeRef from stored times
  useEffect(() => {
    const storedTimes = getStoredExecutionTimes();
    Object.entries(storedTimes).forEach(([strategyId, timeStr]) => {
      lastExecutionTimeRef.current[strategyId] = new Date(timeStr).getTime();
    });
  }, []);

  // Update stored execution times when they change
  useEffect(() => {
    saveExecutionTimes(lastExecution);
  }, [lastExecution]);

  // Clear intervals when strategy is deleted
  useEffect(() => {
    if (!strategy) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = undefined;
      }
    }
  }, [strategy]);

  // DCA Strategy Implementation
  const executeDCAStrategy = useCallback((config: StrategyConfig & { type: 'DCA' }, strategyId: string) => {
    const { symbol, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;
    
    console.log('Executing DCA strategy:', {
      symbol,
      amount,
      currentPrice: cryptoInfo.currentPrice,
      lastExecution: lastExecution[strategyId],
      time: new Date().toISOString()
    });

    const cryptoAmount = amount / cryptoInfo.currentPrice;
    executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    
    const newExecutionTime = new Date().toISOString();
    setLastExecution(prev => {
      const updated = { ...prev, [strategyId]: newExecutionTime };
      saveExecutionTimes(updated);
      return updated;
    });
    lastExecutionTimeRef.current[strategyId] = Date.now();
  }, [cryptoData, executeOrder, lastExecution]);

  // Moving Average Strategy Implementation
  const executeMAStrategy = (config: StrategyConfig & { type: 'MOVING_AVERAGE' }) => {
    if (!strategy) return;
    
    const { symbol, shortPeriod, longPeriod, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;

    const shortMA = cryptoInfo.currentPrice;
    const longMA = cryptoInfo.currentPrice * 0.99;

    if (shortMA > longMA) {
      const cryptoAmount = amount / cryptoInfo.currentPrice;
      executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    } else if (shortMA < longMA) {
      executeOrder('sell', cryptoInfo.symbol, amount, cryptoInfo.currentPrice);
    }
    
    const newExecutionTime = new Date().toISOString();
    setLastExecution(prev => {
      const updated = { ...prev, [strategy.id]: newExecutionTime };
      saveExecutionTimes(updated);
      return updated;
    });
  };

  // Grid Trading Strategy Implementation
  const executeGridStrategy = (config: StrategyConfig & { type: 'GRID' }) => {
    if (!strategy) return;
    
    const { symbol, upperLimit, lowerLimit, gridLines, investmentPerGrid } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;

    const currentPrice = cryptoInfo.currentPrice;
    const gridSize = (upperLimit - lowerLimit) / gridLines;
    
    const levels = Array.from({ length: gridLines + 1 }, (_, i) => lowerLimit + (i * gridSize));
    
    const nearestLower = levels.reverse().find(level => level < currentPrice);
    const nearestUpper = levels.reverse().find(level => level > currentPrice);
    
    if (nearestLower && currentPrice < nearestLower * 1.02) {
      const cryptoAmount = investmentPerGrid / currentPrice;
      executeOrder('buy', cryptoInfo.symbol, cryptoAmount, currentPrice);
    } else if (nearestUpper && currentPrice > nearestUpper * 0.98) {
      const cryptoAmount = investmentPerGrid / currentPrice;
      executeOrder('sell', cryptoInfo.symbol, cryptoAmount, currentPrice);
    }
    
    const newExecutionTime = new Date().toISOString();
    setLastExecution(prev => {
      const updated = { ...prev, [strategy.id]: newExecutionTime };
      saveExecutionTimes(updated);
      return updated;
    });
  };

  const shouldExecuteStrategy = useCallback(() => {
    if (!strategy?.id) return false;
    
    const now = Date.now();
    const lastExecTime = lastExecutionTimeRef.current[strategy.id] || 0;
    const interval = strategy.config.type === 'DCA'
      ? Math.max(strategy.config.interval * 60 * 60 * 1000, 30 * 1000) // Minimum 30-second interval for testing
      : 5 * 60 * 1000;

    const timeSinceLastExec = now - lastExecTime;
    console.log('Checking execution timing:', {
      strategyId: strategy.id,
      lastExecTime: new Date(lastExecTime).toISOString(),
      interval: interval / (60 * 1000) + ' minutes',
      timeSinceLastExec: timeSinceLastExec / (60 * 1000) + ' minutes',
      shouldExecute: timeSinceLastExec >= interval
    });

    return timeSinceLastExec >= interval;
  }, [strategy]);

  useEffect(() => {
    if (!strategy?.config.enabled || !cryptoData.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = undefined;
      }
      return;
    }

    const executeStrategy = () => {
      // For DCA strategies, check if this is the first execution
      const isFirstExecution = strategy.config.type === 'DCA' && !lastExecution[strategy.id];
      
      // Only execute if it's the first time or if enough time has passed
      if (!isFirstExecution && !shouldExecuteStrategy()) return;

      console.log('Executing strategy:', {
        strategyId: strategy.id,
        type: strategy.config.type,
        isFirstExecution,
        currentTime: new Date().toISOString()
      });

      switch (strategy.config.type) {
        case 'DCA':
          executeDCAStrategy(strategy.config, strategy.id);
          break;
        case 'MOVING_AVERAGE':
          executeMAStrategy(strategy.config);
          break;
        case 'GRID':
          executeGridStrategy(strategy.config);
          break;
      }
    };

    // Clear existing intervals
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);

    // Calculate check interval based on strategy type
    let checkInterval: number;
    if (strategy.config.type === 'DCA') {
      // For DCA, check every 10 seconds to ensure we don't miss the execution window
      checkInterval = 10 * 1000; // 10 seconds
    } else {
      // For other strategies, check every 5 minutes
      checkInterval = 5 * 60 * 1000;
    }
    
    // Execute immediately only for first-time DCA strategies
    if (strategy.config.type === 'DCA' && !lastExecution[strategy.id]) {
      executeStrategy();
    } else {
      // For existing strategies, check if we need to execute now
      executeStrategy();
    }

    // Set up the interval checks
    intervalRef.current = setInterval(executeStrategy, checkInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [strategy, cryptoData, executeOrder, executeDCAStrategy, shouldExecuteStrategy, lastExecution]);

  const getLastExecutionTime = useCallback((strategyId: string): string => {
    const executionTime = lastExecution[strategyId];
    if (!executionTime) {
      return 'Never';
    }
    try {
      return new Date(executionTime).toLocaleString();
    } catch (e) {
      return 'Never';
    }
  }, [lastExecution]);

  return {
    lastExecution,
    getLastExecutionTime
  };
}