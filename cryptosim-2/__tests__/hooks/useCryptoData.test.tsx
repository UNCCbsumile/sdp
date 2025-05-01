import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { useCryptoData } from '@/hooks/use-crypto-data';
import { renderHook, act } from '@testing-library/react';
import { CryptoData } from '@/types/crypto';

// Mock the crypto-api module
jest.mock('@/lib/crypto-api', () => ({
  fetchCryptoData: jest.fn(),
  setupPriceUpdates: jest.fn(() => () => {}),
  generateMockPriceUpdates: jest.fn(() => () => {})
}));

const mockCryptoData = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://example.com/btc.png",
    current_price: 50000,
    market_cap: 1000000000000,
    total_volume: 50000000000,
    price_change_percentage_24h: 2.5,
    sparkline_in_7d: { price: [50000, 51000, 49000, 52000, 50500] }
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://example.com/eth.png",
    current_price: 3000,
    market_cap: 400000000000,
    total_volume: 25000000000,
    price_change_percentage_24h: 1.8,
    sparkline_in_7d: { price: [3000, 3100, 2900, 3200, 3050] }
  }
];

describe('useCryptoData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset modules to ensure clean state
    jest.resetModules();
  });

  test('should load initial crypto data', async () => {
    const { fetchCryptoData } = require('@/lib/crypto-api');
    
    // Mock the fetch response
    global.fetch = jest.fn((): Promise<Response> =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCryptoData)
      } as Response)
    );

    const { result } = renderHook(() => useCryptoData());

    // Initial state
    expect(result.current.cryptoData).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verify loaded state
    expect(result.current.cryptoData.length).toBe(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isLiveData).toBe(true);
    expect(result.current.usingMockData).toBe(false);

    // Verify data structure
    const btcData = result.current.cryptoData.find(c => c.id === 'bitcoin');
    expect(btcData).toBeTruthy();
    expect(btcData?.currentPrice).toBe(50000);
    expect(btcData?.priceChangePercentage24h).toBe(2.5);
  });

  test('should handle API errors and use mock data', async () => {
    const { fetchCryptoData } = require('@/lib/crypto-api');
    
    // Mock a failed fetch
    global.fetch = jest.fn((): Promise<Response> =>
      Promise.reject(new Error('API Error'))
    );

    const { result } = renderHook(() => useCryptoData());

    // Initial state
    expect(result.current.cryptoData).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Verify fallback to mock data
    expect(result.current.cryptoData.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Using simulated data due to API error");
    expect(result.current.isLiveData).toBe(false);
    expect(result.current.usingMockData).toBe(true);

    // Verify mock data structure
    const btcData = result.current.cryptoData.find(c => c.id === 'bitcoin');
    expect(btcData).toBeTruthy();
    expect(btcData?.currentPrice).toBeGreaterThan(0);
    expect(typeof btcData?.priceChangePercentage24h).toBe('number');
  });

  test('should refresh data on demand', async () => {
    const { fetchCryptoData } = require('@/lib/crypto-api');
    
    // Mock the initial fetch
    global.fetch = jest.fn((): Promise<Response> =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCryptoData)
      } as Response)
    );

    const { result } = renderHook(() => useCryptoData());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Clear mocks
    jest.clearAllMocks();

    // Set up new mock response for refresh
    global.fetch = jest.fn((): Promise<Response> =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCryptoData)
      } as Response)
    );

    // Trigger refresh and verify data updates
    await act(async () => {
      await result.current.refreshData();
    });

    // Verify refreshed state
    expect(result.current.cryptoData.length).toBe(2);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isLiveData).toBe(true);
    expect(result.current.usingMockData).toBe(false);

    // Verify data structure
    const btcData = result.current.cryptoData.find(c => c.id === 'bitcoin');
    expect(btcData).toBeTruthy();
    expect(btcData?.currentPrice).toBe(50000);
    expect(btcData?.priceChangePercentage24h).toBe(2.5);
  });
}); 