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
  const [isClient, setIsClient] = useState(false);
  const lastExecutionTimeRef = useRef<Record<string, number>>({});

  // Initialize lastExecutionTimeRef from stored times
  useEffect(() => {
    const storedTimes = getStoredExecutionTimes();
    Object.entries(storedTimes).forEach(([strategyId, timeStr]: [string, string]) => {
      lastExecutionTimeRef.current[strategyId] = new Date(timeStr).getTime();
    });
    setIsClient(true);
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
    if (!isClient) return;
    
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
  }, [isClient, cryptoData, executeOrder, lastExecution]);

  // Moving Average Strategy Implementation
  const executeMAStrategy = (config: StrategyConfig & { type: 'MOVING_AVERAGE' }) => {
    if (!isClient || !strategy) return;
    
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
      ? Math.max(strategy.config.interval * 60 * 60 * 1000, 6 * 60 * 1000)
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
    if (!strategy?.config.enabled || !cryptoData.length || !isClient) {
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
      // For DCA strategies, execute immediately if it's the first time
      if (strategy.config.type === 'DCA' && !lastExecution[strategy.id]) {
        console.log('Executing DCA strategy for the first time:', {
          strategyId: strategy.id,
          currentTime: new Date().toISOString()
        });
        executeDCAStrategy(strategy.config, strategy.id);
        return;
      }

      // For subsequent executions, check the interval
      if (!shouldExecuteStrategy()) return;

      console.log('Executing strategy:', {
        strategyId: strategy.id,
        type: strategy.config.type,
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

    // Execute immediately
    executeStrategy();

    // Set up the interval checks
    if (strategy.config.type === 'DCA') {
      // Check every minute for DCA strategies
      checkIntervalRef.current = setInterval(executeStrategy, 60 * 1000);
    } else {
      // Standard interval for other strategies
      intervalRef.current = setInterval(executeStrategy, 5 * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [strategy, cryptoData, executeOrder, executeDCAStrategy, shouldExecuteStrategy, isClient, lastExecution]);

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