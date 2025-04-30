import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { useStrategies } from '@/hooks/use-strategies';
import { renderHook, act } from '@testing-library/react';
import { Strategy } from '@/types/strategy';

// Mock fetch
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  } as Response)
) as unknown as typeof global.fetch;

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}));

const mockStrategy: Strategy = {
  id: '1',
  name: 'Test Strategy',
  config: {
    type: 'DCA',
    enabled: true,
    symbol: 'BTC',
    amount: 100,
    interval: 24
  }
};

const mockFetchResponse = (data: any) => ({
  ok: true,
  json: () => Promise.resolve(data)
} as Response);

describe('useStrategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load initial strategies', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse([mockStrategy])));

    const { result } = renderHook(() => useStrategies());

    // Initial state
    expect(result.current.strategies).toEqual([]);
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verify loaded state
    expect(result.current.strategies).toEqual([mockStrategy]);
    expect(result.current.isLoading).toBe(false);
  });

  test('should add a new strategy', async () => {
    // Initial empty state
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse([])));

    const { result } = renderHook(() => useStrategies());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Mock the POST request to return just the strategy, not an array
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse(mockStrategy)));

    await act(async () => {
      await result.current.addStrategy(mockStrategy);
    });

    expect(result.current.strategies).toEqual([mockStrategy]);
  });

  test('should update an existing strategy', async () => {
    // Initial state with existing strategy
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse([mockStrategy])));

    const { result } = renderHook(() => useStrategies());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const updatedStrategy = {
      ...mockStrategy,
      name: 'Updated Strategy'
    };

    // Mock the update request to return just the updated strategy
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse(updatedStrategy)));

    await act(async () => {
      await result.current.updateStrategy(updatedStrategy);
    });

    expect(result.current.strategies).toEqual([updatedStrategy]);
  });

  test('should delete a strategy', async () => {
    // Initial load with existing strategy
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse([mockStrategy])));

    const { result } = renderHook(() => useStrategies());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Mock the delete request
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockFetchResponse({})));

    // Delete strategy
    await act(async () => {
      await result.current.deleteStrategy(mockStrategy.id);
    });

    expect(result.current.strategies).toEqual([]);
  });
}); 