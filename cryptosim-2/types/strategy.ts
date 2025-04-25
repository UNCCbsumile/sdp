export type StrategyType = 'DCA' | 'REBALANCING' | 'MOVING_AVERAGE' | 'GRID' | 'STOP_LOSS';

export interface BaseStrategyConfig {
  enabled: boolean;
  symbol: string;
  lastExecuted?: string;
}

export interface DCAConfig extends BaseStrategyConfig {
  type: 'DCA';
  amount: number;
  interval: number; // in hours
}

export interface RebalancingConfig extends BaseStrategyConfig {
  type: 'REBALANCING';
  targetAllocation: number; // percentage
  rebalanceThreshold: number; // percentage
  checkInterval: number; // in hours
}

export interface MovingAverageConfig extends BaseStrategyConfig {
  type: 'MOVING_AVERAGE';
  shortPeriod: number;
  longPeriod: number;
  amount: number;
}

export interface GridTradingConfig extends BaseStrategyConfig {
  type: 'GRID';
  upperLimit: number;
  lowerLimit: number;
  gridLines: number;
  investmentPerGrid: number;
}

export interface StopLossConfig extends BaseStrategyConfig {
  type: 'STOP_LOSS';
  stopLoss: number; // percentage
  takeProfit: number; // percentage
  trailingStop: boolean;
}

export type StrategyConfig = 
  | DCAConfig 
  | RebalancingConfig 
  | MovingAverageConfig 
  | GridTradingConfig 
  | StopLossConfig;

export interface Strategy {
  id: string;
  name: string;
  config: StrategyConfig;
}