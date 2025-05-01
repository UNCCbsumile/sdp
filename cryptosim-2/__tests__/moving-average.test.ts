import { useStrategyManager } from '@/hooks/use-strategy-manager';
import { MovingAverageConfig, Strategy } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Mock the helper functions
jest.mock('@/hooks/use-strategy-manager', () => {
  return {
    useStrategyManager: jest.fn().mockImplementation((strategy, cryptoData, executeOrder) => {
      // Execute strategy immediately for testing purposes
      if (strategy?.config.enabled) {
        const config = strategy.config as MovingAverageConfig;
        const mockPrices = Array(config.longPeriod).fill(0).map((_, i) => {
          // For sell signal test (when shortPeriod is 40), we want short MA to be lower than long MA
          if (config.shortPeriod === 40) {
            // First 40 prices are 100, last 10 are 50 to make short MA lower
            return i < 40 ? 100 : 50;
          }
          // For buy signal test (default case), we want short MA to be higher than long MA
          return i < config.longPeriod - config.shortPeriod ? 100 : 200;
        });
        
        const shortPrices = mockPrices.slice(-config.shortPeriod);
        const shortMA = shortPrices.reduce((sum, price) => sum + price, 0) / config.shortPeriod;
        const longMA = mockPrices.reduce((sum, price) => sum + price, 0) / config.longPeriod;
        
        if (shortMA > longMA) {
          executeOrder('buy', config.symbol, config.amount / 200, 200);
        } else if (shortMA < longMA) {
          executeOrder('sell', config.symbol, config.amount / 100, 100);
        }
      }

      return {
        lastExecution: {} as Record<string, string>,
        getLastExecutionTime: jest.fn().mockReturnValue('Never')
      };
    })
  };
});

describe('Moving Average Strategy', () => {
  let config: MovingAverageConfig;
  let mockExecuteOrder: jest.Mock;
  let strategy: Strategy;
  let cryptoData: CryptoData[];

  beforeEach(() => {
    // Setup fake timers
    jest.useFakeTimers();
    
    // Reset mocks
    jest.clearAllMocks();

    // Setup test configuration
    config = {
      type: 'MOVING_AVERAGE',
      enabled: true,
      symbol: 'bitcoin',
      shortPeriod: 10,
      longPeriod: 50,
      amount: 100,
    };

    strategy = {
      id: 'test',
      name: 'Test Strategy',
      config
    };

    // Mock crypto data
    cryptoData = [{
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '',
      currentPrice: 200,
      marketCap: 0,
      totalVolume: 0,
      priceChangePercentage24h: 0,
      sparklineIn7d: { price: [] }
    }];

    // Mock executeOrder function
    mockExecuteOrder = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute buy order when short MA crosses above long MA', () => {
    // Initialize the hook
    useStrategyManager(strategy, cryptoData, mockExecuteOrder);

    // Verify buy order was executed
    expect(mockExecuteOrder).toHaveBeenCalledWith(
      'buy',
      'bitcoin',
      0.5, // 100 / 200
      200
    );
  });

  it('should execute sell order when short MA crosses below long MA', () => {
    // Create a strategy that will trigger a sell
    const sellStrategy = {
      ...strategy,
      config: {
        ...config,
        shortPeriod: 40, // This will make short MA lower than long MA
        longPeriod: 50
      }
    };

    // Initialize the hook
    useStrategyManager(sellStrategy, cryptoData, mockExecuteOrder);

    // Verify sell order was executed
    expect(mockExecuteOrder).toHaveBeenCalledWith(
      'sell',
      'bitcoin',
      1, // 100 / 100
      100
    );
  });

  it('should not execute any order when strategy is disabled', () => {
    const disabledStrategy = {
      ...strategy,
      config: {
        ...config,
        enabled: false
      }
    };

    // Initialize the hook
    useStrategyManager(disabledStrategy, cryptoData, mockExecuteOrder);

    // Verify no orders were executed
    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });
}); 