import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { usePortfolio } from '@/hooks/use-portfolio';
import { renderHook, act } from '@testing-library/react';
import { UserProvider } from '@/app/context/UserContext';
import React from 'react';

// Mock types
type PortfolioItem = {
  symbol: string;
  name: string;
  amount: number;
  averagePrice: number;
  transactions: {
    type: string;
    symbol: string;
    amount: number;
    price: number;
    timestamp: string;
  }[];
};

// Mock initial portfolio data
const mockPortfolio: PortfolioItem[] = [{
  symbol: "USD",
  name: "US Dollar",
  amount: 10000,
  averagePrice: 1,
  transactions: []
}];

// Mock fetch
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockPortfolio)
  } as Response)
) as unknown as typeof global.fetch;

// Add mock crypto data
const mockCryptoData = [{
  id: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  image: "https://example.com/btc.png",
  currentPrice: 50000,
  marketCap: 1000000000000,
  totalVolume: 50000000000,
  priceChangePercentage24h: 2.5,
  sparklineIn7d: { price: [] }
}];

describe('usePortfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load initial portfolio', async () => {
    const { result } = renderHook(() => usePortfolio(mockCryptoData), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>
    });

    // Initial state should have USD
    expect(result.current.portfolio).toEqual([{
      symbol: "USD",
      name: "US Dollar",
      amount: 10000,
      averagePrice: 1,
      transactions: []
    }]);

    // Wait for portfolio to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // After loading, portfolio should still match the initial state
    expect(result.current.portfolio).toEqual(mockPortfolio);
  });
}); 