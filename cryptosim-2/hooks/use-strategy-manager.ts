import { useState, useEffect, useRef, useCallback } from 'react';
import { Strategy, StrategyConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Create a global store for last execution times that persists across refreshes
const STORAGE_KEY = 'strategy_execution_times';
const getStoredExecutionTimes = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('Error reading from storage:', e);
    return {};
  }
};

const saveExecutionTimes = (times: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
  } catch (e) {
    console.error('Error saving to storage:', e);
    // Continue execution even if storage fails
  }
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
    try {
      const storedTimes = getStoredExecutionTimes();
      Object.entries(storedTimes).forEach(([strategyId, timeStr]) => {
        lastExecutionTimeRef.current[strategyId] = new Date(timeStr).getTime();
      });
    } catch (e) {
      console.error('Error initializing execution times:', e);
    }
  }, []);

  // Update stored execution times when they change
  useEffect(() => {
    try {
      saveExecutionTimes(lastExecution);
    } catch (e) {
      console.error('Error saving execution times:', e);
    }
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
    
    if (!cryptoInfo || amount <= 0) return;
    
    console.log('Executing DCA strategy:', {
      symbol,
      amount,
      currentPrice: cryptoInfo.currentPrice,
      lastExecution: lastExecution[strategyId],
      time: new Date().toISOString()
    });

    const cryptoAmount = amount / cryptoInfo.currentPrice;
    executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    
    try {
      const newExecutionTime = new Date().toISOString();
      setLastExecution(prev => {
        const updated = { ...prev, [strategyId]: newExecutionTime };
        saveExecutionTimes(updated);
        return updated;
      });
      lastExecutionTimeRef.current[strategyId] = Date.now();
    } catch (error) {
      console.error('Failed to save execution time:', error);
      // Continue execution even if storage fails
    }
  }, [cryptoData, executeOrder, lastExecution]);

  // Moving Average Strategy Implementation
  const executeMAStrategy = async (config: StrategyConfig & { type: 'MOVING_AVERAGE' }) => {
    if (!strategy) return;
    
    const { symbol, shortPeriod, longPeriod, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;

    try {
      // Fetch historical data for the longest period needed
      const response = await fetch(`/api/crypto/historical/${cryptoInfo.symbol}?timeRange=1M`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const historicalData = await response.json();
      
      // Calculate moving averages based on actual time periods
      const calculateMA = (period: number) => {
        // Convert period from days to milliseconds
        const periodMs = period * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        // Filter data points within the period
        const relevantData = historicalData.filter((d: any) => 
          (now - d.timestamp) <= periodMs
        );
        
        if (relevantData.length === 0) {
          console.warn(`No data points found for ${period}-day period`);
          return cryptoInfo.currentPrice;
        }
        
        // Calculate average price for the period
        const sum = relevantData.reduce((total: number, d: any) => total + d.price, 0);
        return sum / relevantData.length;
      };

      const shortMA = calculateMA(shortPeriod);
      const longMA = calculateMA(longPeriod);

      console.log('Moving Average Strategy:', {
        symbol: cryptoInfo.symbol,
        shortMA,
        longMA,
        currentPrice: cryptoInfo.currentPrice,
        shortPeriod,
        longPeriod,
        shortMAAboveLongMA: shortMA > longMA,
        previousShortMA: lastExecutionTimeRef.current[`${strategy.id}_shortMA`],
        previousLongMA: lastExecutionTimeRef.current[`${strategy.id}_longMA`]
      });

      // Only execute if there's a crossover (previous state was different)
      const previousShortMA = lastExecutionTimeRef.current[`${strategy.id}_shortMA`];
      const previousLongMA = lastExecutionTimeRef.current[`${strategy.id}_longMA`];
      
      // Store current MAs for next comparison
      lastExecutionTimeRef.current[`${strategy.id}_shortMA`] = shortMA;
      lastExecutionTimeRef.current[`${strategy.id}_longMA`] = longMA;

      // Only execute if we have previous values and there's a crossover
      if (previousShortMA !== undefined && previousLongMA !== undefined) {
        const wasAbove = previousShortMA > previousLongMA;
        const isAbove = shortMA > longMA;
        
        if (wasAbove !== isAbove) {
          if (isAbove) {
            // Short MA crosses above Long MA - Buy signal
            const cryptoAmount = amount / cryptoInfo.currentPrice;
            executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
            
            // Only update last execution time when a trade is executed
            const newExecutionTime = new Date().toISOString();
            setLastExecution(prev => {
              const updated = { ...prev, [strategy.id]: newExecutionTime };
              saveExecutionTimes(updated);
              return updated;
            });
            lastExecutionTimeRef.current[strategy.id] = Date.now();
          } else {
            // Short MA crosses below Long MA - Sell signal
            executeOrder('sell', cryptoInfo.symbol, amount, cryptoInfo.currentPrice);
            
            // Only update last execution time when a trade is executed
            const newExecutionTime = new Date().toISOString();
            setLastExecution(prev => {
              const updated = { ...prev, [strategy.id]: newExecutionTime };
              saveExecutionTimes(updated);
              return updated;
            });
            lastExecutionTimeRef.current[strategy.id] = Date.now();
          }
        }
      }
    } catch (error) {
      console.error('Error executing moving average strategy:', error);
    }
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