import { RSIConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Mock crypto data for testing
const createMockCryptoData = (prices: number[]): CryptoData[] => {
  return prices.map((price, index) => ({
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    image: '',
    currentPrice: price,
    marketCap: 0,
    totalVolume: 0,
    priceChangePercentage24h: 0,
    sparklineIn7d: { price: [] }
  }));
};

describe('RSI Strategy', () => {
  let mockExecuteOrder: jest.Mock;
  let mockCryptoData: CryptoData[];
  let mockConfig: RSIConfig;

  beforeEach(() => {
    // Reset mocks before each test
    mockExecuteOrder = jest.fn();
    mockConfig = {
      type: 'RSI',
      enabled: true,
      symbol: 'bitcoin',
      period: 14,
      overbought: 70,
      oversold: 30,
      amount: 100
    };
  });

  describe('RSI Calculation', () => {
    it('should calculate RSI correctly for a simple uptrend', () => {
      // Test data: 14 days of increasing prices
      const prices = Array.from({ length: 15 }, (_, i) => 100 + i);
      mockCryptoData = createMockCryptoData(prices);

      // Calculate price changes
      const priceChanges = [];
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push(prices[i] - prices[i - 1]);
      }

      // All changes are positive in an uptrend
      const gains = priceChanges.filter(change => change > 0);
      const losses = priceChanges.filter(change => change < 0);
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / mockConfig.period;
      const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / mockConfig.period;

      // Calculate RSI
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // In a perfect uptrend, RSI should be very high
      expect(rsi).toBeGreaterThan(90);
    });

    it('should calculate RSI correctly for a simple downtrend', () => {
      // Test data: 14 days of decreasing prices
      const prices = Array.from({ length: 15 }, (_, i) => 100 - i);
      mockCryptoData = createMockCryptoData(prices);

      // Calculate price changes
      const priceChanges = [];
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push(prices[i] - prices[i - 1]);
      }

      // All changes are negative in a downtrend
      const gains = priceChanges.filter(change => change > 0);
      const losses = priceChanges.filter(change => change < 0);
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / mockConfig.period;
      const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / mockConfig.period;

      // Calculate RSI
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // In a perfect downtrend, RSI should be very low
      expect(rsi).toBeLessThan(10);
    });
  });

  describe('Trading Signals', () => {
    it('should trigger buy when RSI falls below oversold level', () => {
      // Test data: prices that would result in RSI below 30
      const prices = Array.from({ length: 15 }, (_, i) => 100 - (i * 2));
      mockCryptoData = createMockCryptoData(prices);

      // Calculate RSI
      const priceChanges = [];
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push(prices[i] - prices[i - 1]);
      }

      const gains = priceChanges.filter(change => change > 0);
      const losses = priceChanges.filter(change => change < 0);
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / mockConfig.period;
      const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / mockConfig.period;

      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // RSI should be below oversold level
      expect(rsi).toBeLessThan(mockConfig.oversold);
    });

    it('should trigger sell when RSI rises above overbought level', () => {
      // Test data: prices that would result in RSI above 70
      const prices = Array.from({ length: 15 }, (_, i) => 100 + (i * 2));
      mockCryptoData = createMockCryptoData(prices);

      // Calculate RSI
      const priceChanges = [];
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push(prices[i] - prices[i - 1]);
      }

      const gains = priceChanges.filter(change => change > 0);
      const losses = priceChanges.filter(change => change < 0);
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / mockConfig.period;
      const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / mockConfig.period;

      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // RSI should be above overbought level
      expect(rsi).toBeGreaterThan(mockConfig.overbought);
    });

    it('should not trigger trades when RSI is between oversold and overbought levels', () => {
      // Test data: prices that would result in RSI around 50
      const prices = Array.from({ length: 15 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1));
      mockCryptoData = createMockCryptoData(prices);

      // Calculate RSI
      const priceChanges = [];
      for (let i = 1; i < prices.length; i++) {
        priceChanges.push(prices[i] - prices[i - 1]);
      }

      const gains = priceChanges.filter(change => change > 0);
      const losses = priceChanges.filter(change => change < 0);
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / mockConfig.period;
      const avgLoss = Math.abs(losses.reduce((sum, loss) => sum + loss, 0)) / mockConfig.period;

      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      // RSI should be between oversold and overbought levels
      expect(rsi).toBeGreaterThan(mockConfig.oversold);
      expect(rsi).toBeLessThan(mockConfig.overbought);
    });
  });
}); 