import { renderHook, act } from '@testing-library/react';
import { useStrategyManager } from '../use-strategy-manager';
import { Strategy, StrategyConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

// Mock console.error before all tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock executeOrder function
const mockExecuteOrder = jest.fn();

describe('useStrategyManager - DCA Strategy', () => {
  const mockCryptoData: CryptoData[] = [
    {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      image: '/crypto-icons/btc.png',
      currentPrice: 50000,
      priceChangePercentage24h: 0,
      marketCap: 0,
      totalVolume: 0,
      sparklineIn7d: { price: [] }
    },
    {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      image: '/crypto-icons/eth.png',
      currentPrice: 3000,
      priceChangePercentage24h: 0,
      marketCap: 0,
      totalVolume: 0,
      sparklineIn7d: { price: [] }
    },
  ];

  const mockDCAStrategy: Strategy = {
    id: 'test-dca',
    name: 'Test DCA',
    config: {
      type: 'DCA',
      symbol: 'bitcoin',
      amount: 100,
      interval: 24, // 24 hours
      enabled: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  // Basic functionality tests
  it('should execute DCA strategy and place buy order with correct parameters', () => {
    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).toHaveBeenCalledWith(
      'buy',
      'BTC',
      0.002, // 100 / 50000
      50000
    );
  });

  it('should store execution time after successful DCA execution', () => {
    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalled();
    const lastExecution = result.current.lastExecution;
    expect(lastExecution['test-dca']).toBeDefined();
  });

  it('should not execute DCA strategy if crypto data is not available', () => {
    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, [], mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });

  it('should respect execution interval', () => {
    const recentExecutionTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ 'test-dca': recentExecutionTime }));

    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });

  // Strategy state tests
  it('should not execute when strategy is disabled', () => {
    const disabledStrategy = {
      ...mockDCAStrategy,
      config: { ...mockDCAStrategy.config, enabled: false },
    };

    const { result } = renderHook(() =>
      useStrategyManager(disabledStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });

  it('should handle missing required fields in strategy config', () => {
    const invalidStrategy = {
      ...mockDCAStrategy,
      config: { type: 'DCA' } as StrategyConfig,
    };

    const { result } = renderHook(() =>
      useStrategyManager(invalidStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });

  // Edge cases
  it('should handle zero amount correctly', () => {
    const zeroAmountStrategy = {
      ...mockDCAStrategy,
      config: { ...mockDCAStrategy.config, amount: 0 },
    };

    const { result } = renderHook(() =>
      useStrategyManager(zeroAmountStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).not.toHaveBeenCalled();
  });

  it('should handle very small amounts correctly', () => {
    const smallAmountStrategy = {
      ...mockDCAStrategy,
      config: { ...mockDCAStrategy.config, amount: 0.01 },
    };

    const { result } = renderHook(() =>
      useStrategyManager(smallAmountStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).toHaveBeenCalledWith(
      'buy',
      'BTC',
      0.0000002, // 0.01 / 50000
      50000
    );
  });

  it('should handle different crypto symbols correctly', () => {
    const ethStrategy = {
      ...mockDCAStrategy,
      config: { ...mockDCAStrategy.config, symbol: 'ethereum' },
    };

    const { result } = renderHook(() =>
      useStrategyManager(ethStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).toHaveBeenCalledWith(
      'buy',
      'ETH',
      0.03333333333333333, // 100 / 3000
      3000
    );
  });

  // Error handling
  it('should handle storage errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    // Strategy should still execute even if storage fails
    expect(mockExecuteOrder).toHaveBeenCalled();
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('should handle invalid storage data gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    // Should treat invalid storage as no previous execution
    expect(mockExecuteOrder).toHaveBeenCalled();
    expect(mockLocalStorage.getItem).toHaveBeenCalled();
  });

  // Multiple executions
  it('should execute after interval has passed', () => {
    const oldExecutionTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ 'test-dca': oldExecutionTime }));

    const { result } = renderHook(() =>
      useStrategyManager(mockDCAStrategy, mockCryptoData, mockExecuteOrder)
    );

    act(() => {
      result.current.getLastExecutionTime('test-dca');
    });

    expect(mockExecuteOrder).toHaveBeenCalled();
  });
}); 