import { useState, useEffect, useRef, useCallback } from 'react';
import { Strategy, StrategyConfig, MovingAverageConfig } from '@/types/strategy';
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

// Add helper functions at the top of the file
const getHistoricalPrices = async (symbol: string, period: number, cryptoData: CryptoData[]): Promise<number[]> => {
  const crypto = cryptoData.find(c => c.id === symbol || c.symbol.toLowerCase() === symbol.toLowerCase());
  if (!crypto) return [];
  
  // Use current price and sparkline data for historical prices
  const prices = [crypto.currentPrice];
  if (crypto.sparklineIn7d && crypto.sparklineIn7d.price.length > 0) {
    prices.push(...crypto.sparklineIn7d.price);
  }
  
  // If we don't have enough prices, duplicate the last known price
  while (prices.length < period) {
    prices.push(prices[prices.length - 1] || crypto.currentPrice);
  }
  
  return prices.slice(0, period);
};

const getCurrentPrice = async (symbol: string, cryptoData: CryptoData[]): Promise<number> => {
  const crypto = cryptoData.find(c => c.id === symbol || c.symbol.toLowerCase() === symbol.toLowerCase());
  return crypto?.currentPrice || 0;
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
  const executeMAStrategy = async (config: MovingAverageConfig, strategyId: string) => {
    try {
      const crypto = cryptoData.find(c => c.id === config.symbol);
      if (!crypto) {
        console.error('Cryptocurrency not found:', config.symbol);
        return;
      }

      // Get historical prices for the longer period
      const prices = await getHistoricalPrices(config.symbol, config.longPeriod, cryptoData);
      if (prices.length < config.longPeriod) {
        console.error('Not enough price data for MA calculation');
        return;
      }
      
      // Calculate short-term MA (last shortPeriod prices)
      const shortPrices = prices.slice(-config.shortPeriod);
      const shortMA = shortPrices.reduce((sum: number, price: number) => sum + price, 0) / config.shortPeriod;
      
      // Calculate long-term MA (all prices)
      const longMA = prices.reduce((sum: number, price: number) => sum + price, 0) / config.longPeriod;
      
      // Get current price
      const currentPrice = await getCurrentPrice(config.symbol, cryptoData);
      if (!currentPrice) {
        console.error('Could not get current price for:', config.symbol);
        return;
      }

      console.log('MA Strategy Check:', {
        symbol: config.symbol,
        currentPrice,
        shortMA,
        longMA,
        lastPrice: prices[prices.length - 2],
        pricesLength: prices.length
      });

      // Generate signal based on crossover
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      
      // Buy when short MA crosses above long MA
      if (shortMA > longMA && prices[prices.length - 2] <= longMA) {
        signal = 'BUY';
      }
      // Sell when short MA crosses below long MA
      else if (shortMA < longMA && prices[prices.length - 2] >= longMA) {
        signal = 'SELL';
      }
      
      // Execute trade if signal is not HOLD
      if (signal !== 'HOLD') {
        console.log('Executing MA trade:', {
          signal,
          symbol: config.symbol,
          amount: config.amount,
          price: currentPrice
        });
        
        const cryptoAmount = config.amount / currentPrice;
        executeOrder(signal.toLowerCase() as 'buy' | 'sell', crypto.symbol, cryptoAmount, currentPrice);
            
        // Update last execution time
        const now = Date.now();
        lastExecutionTimeRef.current[strategyId] = now;
        const newExecutionTime = new Date(now).toISOString();
        setLastExecution(prev => ({
          ...prev,
          [strategyId]: newExecutionTime
        }));
      }
    } catch (error) {
      console.error('Error executing MA strategy:', error);
    }
  };

  // RSI Strategy Implementation
  const executeRSIStrategy = useCallback((config: StrategyConfig & { type: 'RSI' }, strategyId: string) => {
    if (!strategy) return;
    
    const { symbol, period, overbought, oversold, amount } = config;
    const cryptoInfo = cryptoData.find((c) => c.id === symbol);
    
    if (!cryptoInfo) return;

    // Get the last N+1 prices for RSI calculation
    const recentPrices = cryptoData
      .filter(c => c.id === symbol)
      .slice(-(period + 1))
      .map(c => c.currentPrice);

    if (recentPrices.length < period + 1) {
      console.log('Not enough data points for RSI calculation');
      return;
    }

    // Calculate price changes
    const priceChanges = [];
    for (let i = 1; i < recentPrices.length; i++) {
      priceChanges.push(recentPrices[i] - recentPrices[i - 1]);
    }

    // Calculate average gain and loss
    const gains = priceChanges.filter(change => change > 0);
    const losses = priceChanges.filter(change => change < 0);
    
    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / period;

    // Calculate RSI
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    console.log('RSI Strategy:', {
      symbol: cryptoInfo.symbol,
      rsi,
      currentPrice: cryptoInfo.currentPrice,
      period,
      overbought,
      oversold
    });

    // Get previous state
    const previousState = lastExecutionTimeRef.current[`${strategyId}_rsi_state`] || 0;
    let currentState = 0;

    // Determine current state
    if (rsi >= overbought) {
      currentState = 1; // Overbought
    } else if (rsi <= oversold) {
      currentState = -1; // Oversold
    }

    // Store current state for next comparison
    lastExecutionTimeRef.current[`${strategyId}_rsi_state`] = currentState;

    // Execute trade if state changed
    if (previousState !== currentState) {
      if (currentState === -1) {
        // RSI below oversold - Buy signal
        const cryptoAmount = amount / cryptoInfo.currentPrice;
        executeOrder('buy', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
      } else if (currentState === 1) {
        // RSI above overbought - Sell signal
        const cryptoAmount = amount / cryptoInfo.currentPrice;
        executeOrder('sell', cryptoInfo.symbol, cryptoAmount, cryptoInfo.currentPrice);
    }
    
      // Update last execution time
    const newExecutionTime = new Date().toISOString();
    setLastExecution(prev => {
        const updated = { ...prev, [strategyId]: newExecutionTime };
      saveExecutionTimes(updated);
      return updated;
    });
      lastExecutionTimeRef.current[strategyId] = Date.now();
    }
  }, [cryptoData, executeOrder]);

  const shouldExecuteStrategy = useCallback(() => {
    if (!strategy?.id) return false;
    
    // For DCA strategies, always execute on first run
    if (strategy.config.type === 'DCA' && !lastExecution[strategy.id]) {
      return true;
    }
    
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
  }, [strategy, lastExecution]);

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
          executeMAStrategy(strategy.config, strategy.id);
          break;
        case 'RSI':
          executeRSIStrategy(strategy.config, strategy.id);
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
    } else if (strategy.config.type === 'MOVING_AVERAGE') {
      // For MA strategy, first establish the baseline state without trading
      const { symbol, shortPeriod, longPeriod } = strategy.config as MovingAverageConfig;
      const cryptoInfo = cryptoData.find((c) => c.id === symbol);
      
      if (cryptoInfo && !lastExecutionTimeRef.current[`${strategy.id}_ma_state`]) {
        // Calculate initial MAs and set initial state without trading
        const recentPrices = cryptoData
          .filter(c => c.id === symbol)
          .slice(-longPeriod)
          .map(c => c.currentPrice);

        if (recentPrices.length >= longPeriod) {
          const shortPrices = recentPrices.slice(-shortPeriod);
          const shortMA = shortPrices.reduce((sum, price) => sum + price, 0) / shortPeriod;
          const longMA = recentPrices.reduce((sum, price) => sum + price, 0) / longPeriod;
          
          // Set initial state without executing any trades
          lastExecutionTimeRef.current[`${strategy.id}_ma_state`] = shortMA > longMA ? 1 : -1;
          
          console.log('Moving Average Strategy: Establishing baseline state', {
            symbol: cryptoInfo.symbol,
            shortMA,
            longMA,
            currentPrice: cryptoInfo.currentPrice,
            initialState: lastExecutionTimeRef.current[`${strategy.id}_ma_state`]
          });
          
          // Set last execution time to prevent immediate trading
          const now = Date.now();
          lastExecutionTimeRef.current[strategy.id] = now;
          const newExecutionTime = new Date(now).toISOString();
          setLastExecution(prev => ({
            ...prev,
            [strategy.id]: newExecutionTime
          }));
          
          return; // Don't execute strategy yet
        }
      }
      // Then proceed with normal strategy check
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
  }, [strategy, cryptoData, executeOrder, executeDCAStrategy, executeMAStrategy, executeRSIStrategy, shouldExecuteStrategy, lastExecution]);

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