export type StrategyType = 'DCA' | 'MOVING_AVERAGE' | 'RSI';

export interface BaseStrategyConfig {
  enabled: boolean;
  symbol: string;
  lastExecuted?: string;
  stopLoss?: {
    percentage: number;  // Percentage below entry price to trigger sell
    trailing?: boolean;  // Whether to use trailing stop loss
  };
}

export interface DCAConfig extends BaseStrategyConfig {
  type: 'DCA';
  amount: number;
  interval: number; // in hours
}

export interface MovingAverageConfig extends BaseStrategyConfig {
  type: 'MOVING_AVERAGE';
  shortPeriod: number;  // Short-term moving average period (e.g., 10)
  longPeriod: number;   // Long-term moving average period (e.g., 50)
  amount: number;       // Amount to invest per trade
}

export interface RSIConfig extends BaseStrategyConfig {
  type: 'RSI';
  period: number;  // RSI calculation period (typically 14)
  overbought: number;  // RSI level to trigger sell (typically 70)
  oversold: number;    // RSI level to trigger buy (typically 30)
  amount: number;      // Amount to invest per trade
}

export type StrategyConfig = 
  | DCAConfig 
  | MovingAverageConfig 
  | RSIConfig;

export interface Strategy {
  id: string;
  name: string;
  config: StrategyConfig;
}