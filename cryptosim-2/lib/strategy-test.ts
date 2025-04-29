import { Strategy, MovingAverageConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Test case 1: Uptrend (HOLD signal)
const uptrendPrices = [
  45000, 45200, 45100, 45300, 45400,  // First 5 prices
  45500, 45600, 45700, 45800, 45900,  // Next 5
  46000, 46100, 46200, 46300, 46400,  // Next 5
  46500, 46600, 46700, 46800, 46900,  // Last 5
  47000, 47100, 47200, 47300, 47400   // Additional prices for testing
];

// Test case 2: Buy Signal (Short MA crosses above Long MA)
const buySignalPrices = [
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 44000,  // Slight dip
  44000, 44500, 45500, 46500, 47000   // Recovery and rise - Creates crossover
];

// Test case 3: Sell Signal (Short MA crosses below Long MA)
const sellSignalPrices = [
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 46000,  // Slight rise
  46000, 45500, 44500, 43500, 42500   // Drop - Creates crossover
];

// Test case 4: Edge case - Insufficient data
const insufficientPrices = [45000, 45200, 45400];

// Helper function to create test crypto data
function createTestCryptoData(prices: number[]): CryptoData {
  return {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "",
    currentPrice: prices[prices.length - 1],
    marketCap: 0,
    totalVolume: 0,
    priceChangePercentage24h: 0,
    sparklineIn7d: {
      price: prices
    }
  };
}

// Test strategy configuration
const testMAStrategy: Strategy = {
  id: "test-ma-1",
  name: "Test Moving Average",
  config: {
    type: 'MOVING_AVERAGE',
    enabled: true,
    symbol: "bitcoin",
    shortPeriod: 5,
    longPeriod: 20,
    amount: 100
  } as MovingAverageConfig
};

// Helper function to calculate moving average
function calculateMovingAverage(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Test function for a single scenario
function runMATest(prices: number[], scenarioName: string) {
  console.log(`\nTesting Scenario: ${scenarioName}`);
  console.log("----------------------------------------");

  const cryptoData = createTestCryptoData(prices);
  const config = testMAStrategy.config as MovingAverageConfig;

  // Check for insufficient data
  if (prices.length < config.longPeriod) {
    console.log("Insufficient data for calculation");
    console.log(`Required: ${config.longPeriod} data points, Got: ${prices.length}`);
    return {
      signal: "INSUFFICIENT_DATA",
      shortMA: 0,
      longMA: 0,
      prevShortMA: 0,
      prevLongMA: 0,
      cryptoAmount: 0
    };
  }

  // Calculate moving averages
  const shortMA = calculateMovingAverage(prices, config.shortPeriod);
  const longMA = calculateMovingAverage(prices, config.longPeriod);
  
  // Calculate previous values for trend analysis
  const prevShortMA = calculateMovingAverage(prices.slice(0, -1), config.shortPeriod);
  const prevLongMA = calculateMovingAverage(prices.slice(0, -1), config.longPeriod);

  console.log("Test Data:");
  console.log(`Current Price: ${cryptoData.currentPrice}`);
  console.log(`5-period MA: ${shortMA.toFixed(2)}`);
  console.log(`20-period MA: ${longMA.toFixed(2)}`);
  console.log(`Previous 5-period MA: ${prevShortMA.toFixed(2)}`);
  console.log(`Previous 20-period MA: ${prevLongMA.toFixed(2)}`);

  // Determine signal
  let signal = "HOLD";
  const shortMAIncreasing = shortMA > prevShortMA;
  const longMAIncreasing = longMA > prevLongMA;
  
  if (shortMA > longMA && prevShortMA <= prevLongMA) {
    signal = "BUY";
  } else if (shortMA < longMA && prevShortMA >= prevLongMA) {
    signal = "SELL";
  }

  console.log("\nSignal Analysis:");
  console.log(`Current Signal: ${signal}`);
  console.log(`Short MA > Long MA: ${shortMA > longMA}`);
  console.log(`Previous Short MA > Previous Long MA: ${prevShortMA > prevLongMA}`);
  console.log(`Short MA Trend: ${shortMAIncreasing ? "Increasing" : "Decreasing"}`);
  console.log(`Long MA Trend: ${longMAIncreasing ? "Increasing" : "Decreasing"}`);

  // Calculate expected order amount
  const cryptoAmount = config.amount / cryptoData.currentPrice;
  
  console.log("\nExpected Order:");
  if (signal !== "HOLD") {
    console.log(`Type: ${signal}`);
    console.log(`Amount in USD: $${config.amount}`);
    console.log(`Amount in Crypto: ${cryptoAmount.toFixed(8)} ${cryptoData.symbol}`);
  } else {
    console.log("No order expected - holding position");
  }

  return {
    signal,
    shortMA,
    longMA,
    prevShortMA,
    prevLongMA,
    cryptoAmount
  };
}

// Main test function that runs all scenarios
export function testMovingAverageStrategy() {
  console.log("Starting Moving Average Strategy Tests...");
  
  const testResults = {
    uptrend: runMATest(uptrendPrices, "Uptrend (Expected: HOLD)"),
    buySignal: runMATest(buySignalPrices, "Buy Signal (Expected: BUY)"),
    sellSignal: runMATest(sellSignalPrices, "Sell Signal (Expected: SELL)"),
    insufficientData: runMATest(insufficientPrices, "Insufficient Data")
  };

  console.log("\nTest Summary:");
  console.log("----------------------------------------");
  console.log("Uptrend Test Signal:", testResults.uptrend.signal);
  console.log("Buy Signal Test Signal:", testResults.buySignal.signal);
  console.log("Sell Signal Test Signal:", testResults.sellSignal.signal);
  console.log("Insufficient Data Test Signal:", testResults.insufficientData.signal);
  
  return testResults;
} 