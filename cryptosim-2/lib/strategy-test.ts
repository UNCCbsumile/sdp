import { Strategy, MovingAverageConfig } from '@/types/strategy';
import { CryptoData } from '@/types/crypto';

// Default values for new parameters
const DEFAULT_MIN_PRICE_MOVEMENT = 0.001;    // 0.1% (reduced from 1%)
const DEFAULT_VOLATILITY_THRESHOLD = 0.05;  // 5%

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
  44000, 44100, 44200, 44300, 44400, // Previous Short MA = 44200 (below previous long MA)
  44500, 44600, 44700, 44800, 44900, // Contributing to Long MA
  45000, 45100, 45200, 45300, 45400, // Contributing to Long MA
  45500, 45600, 45700, 45800, 45900, // Contributing to Long MA
  44000, 44500, 45000, 46000, 47000  // Current Short MA = 45300 (crosses above long MA)
].reverse();

// Test case 3: Sell Signal (Short MA crosses below Long MA)
const sellSignalPrices = [
  47000, 47100, 47200, 47300, 47400, // Previous Short MA = 47200 (above previous long MA)
  47500, 47600, 47700, 47800, 47900, // Contributing to Long MA
  48000, 48100, 48200, 48300, 48400, // Contributing to Long MA
  48500, 48600, 48700, 48800, 48900, // Contributing to Long MA
  49000, 48000, 47000, 46000, 45000  // Current Short MA = 47000 (crosses below long MA)
].reverse();

// Test case 4: Edge case - Insufficient data
const insufficientPrices = [45000, 45200, 45400];

// Test case 5: High Volatility
const highVolatilityPrices = [
  45000, 46000, 44000, 47000, 43000,  // High volatility period 1
  48000, 42000, 49000, 41000, 50000,  // High volatility period 2
  51000, 40000, 52000, 39000, 53000,  // High volatility period 3
  54000, 38000, 55000, 37000, 56000,  // High volatility period 4
  57000, 36000, 58000, 35000, 59000   // High volatility period 5
];

// Test case 6: Sideways Market
const sidewaysPrices = [
  45000, 45100, 44900, 45200, 44800,  // Small fluctuations
  45300, 44700, 45400, 44600, 45500,  // Small fluctuations
  44500, 45600, 44400, 45700, 44300,  // Small fluctuations
  45800, 44200, 45900, 44100, 46000,  // Small fluctuations
  44000, 46100, 43900, 46200, 43800   // Small fluctuations
];

// Test case 7: False Signal (Whipsaw)
const falseSignalPrices = [
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 46000,  // Small rise
  46000, 44000, 46000, 44000, 46000   // Rapid oscillations
];

// Test case 8: Price Gap
const priceGapPrices = [
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  45000, 45000, 45000, 45000, 45000,  // Flat
  50000, 50000, 50000, 50000, 50000   // Sudden gap up
];

// Test case 9: Extreme Prices
const extremePrices = [
  1000, 1000, 1000, 1000, 1000,      // Very low prices
  1000, 1000, 1000, 1000, 1000,      // Very low prices
  1000, 1000, 1000, 1000, 1000,      // Very low prices
  1000, 1000, 1000, 1000, 1000,      // Very low prices
  1000, 1000, 1000, 1000, 1000       // Very low prices
];

// Helper function to create test crypto data with proper order
function createTestCryptoData(prices: number[]): CryptoData {
  const currentPrice = prices[prices.length - 1];
  return {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    currentPrice,
    marketCap: currentPrice * 19000000,
    totalVolume: currentPrice * 100000,
    priceChangePercentage24h: (currentPrice - prices[0]) / prices[0] * 100,
    sparklineIn7d: {
      price: prices
    }
  };
}

// Test strategy configuration with new parameters
const testMAStrategy: Strategy = {
  id: "test-ma-1",
  name: "Test Moving Average",
  config: {
    type: 'MOVING_AVERAGE',
    enabled: true,
    symbol: "bitcoin",
    shortPeriod: 5,
    longPeriod: 20,
    amount: 100,
    minPriceMovement: DEFAULT_MIN_PRICE_MOVEMENT,
    volatilityThreshold: DEFAULT_VOLATILITY_THRESHOLD,
    requireVolumeConfirmation: true
  } as MovingAverageConfig
};

// Helper function to calculate moving average
function calculateMovingAverage(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Helper function to calculate volatility
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

// Helper function to check if price movement is significant
function isSignificantMovement(shortMA: number, longMA: number, minMovement: number): boolean {
  return Math.abs(shortMA - longMA) / longMA >= minMovement;
}

// Updated test function for a single scenario
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

  // Calculate volatility
  const volatility = calculateVolatility(prices);
  const minMovement = config.minPriceMovement || DEFAULT_MIN_PRICE_MOVEMENT;
  const volatilityThreshold = config.volatilityThreshold || DEFAULT_VOLATILITY_THRESHOLD;

  console.log("Test Data:");
  console.log(`Current Price: ${cryptoData.currentPrice}`);
  console.log(`5-period MA: ${shortMA.toFixed(2)}`);
  console.log(`20-period MA: ${longMA.toFixed(2)}`);
  console.log(`Previous 5-period MA: ${prevShortMA.toFixed(2)}`);
  console.log(`Previous 20-period MA: ${prevLongMA.toFixed(2)}`);
  console.log(`Volatility: ${(volatility * 100).toFixed(2)}%`);
  console.log(`Price Movement: ${(Math.abs(shortMA - longMA) / longMA * 100).toFixed(2)}%`);
  console.log(`Current Volume: ${cryptoData.totalVolume.toFixed(2)}`);
  console.log(`Average Volume: ${(cryptoData.totalVolume / prices.length).toFixed(2)}`);

  // Determine signal with new conditions
  let signal = "HOLD";
  const shortMAIncreasing = shortMA > prevShortMA;
  const longMAIncreasing = longMA > prevLongMA;
  
  // Check volatility first
  if (volatility > volatilityThreshold) {
    console.log("High volatility detected - holding position");
    signal = "HOLD";
  }
  // Check price movement significance
  else if (!isSignificantMovement(shortMA, longMA, minMovement)) {
    console.log("Price movement too small - holding position");
    signal = "HOLD";
  }
  // Check volume confirmation if required
  else if (config.requireVolumeConfirmation && !hasVolumeConfirmation(prices)) {
    console.log("No volume confirmation - holding position");
    signal = "HOLD";
  }
  // Check for crossover signals
  else {
    const currentCrossover = shortMA - longMA;
    const previousCrossover = prevShortMA - prevLongMA;
    
    // Buy signal: Short MA crosses above Long MA
    if (currentCrossover > 0 && previousCrossover <= 0) {
      console.log("Buy signal detected: Short MA crossed above Long MA");
      signal = "BUY";
    }
    // Sell signal: Short MA crosses below Long MA
    else if (currentCrossover < 0 && previousCrossover >= 0) {
      console.log("Sell signal detected: Short MA crossed below Long MA");
      signal = "SELL";
    }
    // No crossover
    else {
      console.log("No crossover detected - holding position");
      signal = "HOLD";
    }
  }

  console.log("\nSignal Analysis:");
  console.log(`Current Signal: ${signal}`);
  console.log(`Short MA > Long MA: ${shortMA > longMA}`);
  console.log(`Previous Short MA > Previous Long MA: ${prevShortMA > prevLongMA}`);
  console.log(`Short MA Trend: ${shortMAIncreasing ? "Increasing" : "Decreasing"}`);
  console.log(`Long MA Trend: ${longMAIncreasing ? "Increasing" : "Decreasing"}`);
  console.log(`Volatility Check: ${volatility <= volatilityThreshold ? "Passed" : "Failed"}`);
  console.log(`Movement Check: ${isSignificantMovement(shortMA, longMA, minMovement) ? "Passed" : "Failed"}`);
  console.log(`Volume Check: ${!config.requireVolumeConfirmation || hasVolumeConfirmation(prices) ? "Passed" : "Failed"}`);

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
    cryptoAmount,
    volatility,
    priceMovement: Math.abs(shortMA - longMA) / longMA,
    hasVolumeConfirmation: hasVolumeConfirmation(prices)
  };
}

// Main test function that runs all scenarios
export function testMovingAverageStrategy() {
  console.log("Starting Moving Average Strategy Tests...");
  
  const testResults = {
    uptrend: runMATest(uptrendPrices, "Uptrend (Expected: HOLD)"),
    buySignal: runMATest(buySignalPrices, "Buy Signal (Expected: BUY)"),
    sellSignal: runMATest(sellSignalPrices, "Sell Signal (Expected: SELL)"),
    insufficientData: runMATest(insufficientPrices, "Insufficient Data"),
    highVolatility: runMATest(highVolatilityPrices, "High Volatility Test"),
    sidewaysMarket: runMATest(sidewaysPrices, "Sideways Market Test"),
    falseSignal: runMATest(falseSignalPrices, "False Signal (Whipsaw) Test"),
    priceGap: runMATest(priceGapPrices, "Price Gap Test"),
    extremePrices: runMATest(extremePrices, "Extreme Prices Test")
  };

  console.log("\nTest Summary:");
  console.log("----------------------------------------");
  console.log("Uptrend Test Signal:", testResults.uptrend.signal);
  console.log("Buy Signal Test Signal:", testResults.buySignal.signal);
  console.log("Sell Signal Test Signal:", testResults.sellSignal.signal);
  console.log("Insufficient Data Test Signal:", testResults.insufficientData.signal);
  console.log("High Volatility Test Signal:", testResults.highVolatility.signal);
  console.log("Sideways Market Test Signal:", testResults.sidewaysMarket.signal);
  console.log("False Signal Test Signal:", testResults.falseSignal.signal);
  console.log("Price Gap Test Signal:", testResults.priceGap.signal);
  console.log("Extreme Prices Test Signal:", testResults.extremePrices.signal);
  
  return testResults;
}

// Update the test function to handle volume checks differently
function hasVolumeConfirmation(prices: number[]): boolean {
  if (prices.length < 2) return false;
  
  // Calculate volume based on price changes
  const currentVolume = prices[prices.length - 1] * 100000; // Base volume
  const averageVolume = prices.reduce((a, b) => a + b * 100000, 0) / prices.length;
  
  // Volume is confirmed if current volume is at least 80% of average volume
  return currentVolume >= averageVolume * 0.8;
} 