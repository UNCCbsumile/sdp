import { Strategy, StrategyConfig } from '@/types/strategy';
import { fetchInitialCryptoData } from './binance-api';
import { readPortfolio, updatePortfolio } from './portfolio-service';
import path from 'path';
import fs from 'fs';

const STRATEGIES_FILE = path.join(process.cwd(), 'data/strategies.json');

// Helper to read strategies
function readStrategies(): Strategy[] {
  const data = fs.readFileSync(STRATEGIES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Helper to write strategies
function writeStrategies(strategies: Strategy[]) {
  fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(strategies, null, 2));
}

// Execute DCA strategy
async function executeDCA(strategy: Strategy) {
  const config = strategy.config;
  if (!config.enabled) return;

  const now = Date.now();
  const lastExecuted = config.lastExecuted ? new Date(config.lastExecuted).getTime() : 0;
  const interval = Math.max(config.interval * 60 * 60 * 1000, 30 * 1000); // Minimum 30-second interval for testing
  const timeSinceLastExec = now - lastExecuted;

  // Only execute if enough time has passed
  if (timeSinceLastExec >= interval) {
    const portfolio = await readPortfolio('default');
    const cryptoData = await fetchInitialCryptoData();
    const asset = cryptoData.find(c => c.symbol === config.symbol);

    if (asset) {
      const amount = config.amount;
      const quantity = amount / asset.currentPrice;

      console.log('Executing DCA trade:', {
        symbol: config.symbol,
        amount,
        quantity,
        currentPrice: asset.currentPrice,
        lastExecuted: config.lastExecuted,
        interval: interval / (60 * 1000) + ' minutes',
        timeSinceLastExec: timeSinceLastExec / (60 * 1000) + ' minutes',
        nextExecution: new Date(now + interval).toISOString()
      });

      // Update portfolio
      const updatedPortfolio = {
        ...portfolio,
        assets: [
          ...portfolio.assets.filter(a => a.symbol !== config.symbol),
          {
            symbol: config.symbol,
            quantity: (portfolio.assets.find(a => a.symbol === config.symbol)?.quantity || 0) + quantity,
            averagePrice: asset.currentPrice
          }
        ]
      };

      await updatePortfolio('default', updatedPortfolio);

      // Update last executed time
      const strategies = readStrategies();
      const updatedStrategy = {
        ...strategy,
        config: {
          ...config,
          lastExecuted: new Date(now).toISOString()
        }
      };
      const index = strategies.findIndex(s => s.id === strategy.id);
      strategies[index] = updatedStrategy;
      writeStrategies(strategies);
    }
  }
}

// Execute Moving Average strategy
async function executeMovingAverage(strategy: Strategy) {
  const config = strategy.config;
  if (!config.enabled) return;

  const cryptoData = await fetchInitialCryptoData();
  const asset = cryptoData.find(c => c.symbol === config.symbol);

  if (asset) {
    // Here you would implement the moving average calculation
    // and trading logic based on the crossover
    // This is a simplified version
    const shouldBuy = true; // Replace with actual MA calculation
    const portfolio = await readPortfolio('default');

    if (shouldBuy) {
      const amount = config.amount;
      const quantity = amount / asset.currentPrice;

      const updatedPortfolio = {
        ...portfolio,
        assets: [
          ...portfolio.assets.filter(a => a.symbol !== config.symbol),
          {
            symbol: config.symbol,
            quantity: (portfolio.assets.find(a => a.symbol === config.symbol)?.quantity || 0) + quantity,
            averagePrice: asset.currentPrice
          }
        ]
      };

      await updatePortfolio('default', updatedPortfolio);
    }
  }
}

// Execute Grid Trading strategy
async function executeGridTrading(strategy: Strategy) {
  const config = strategy.config;
  if (!config.enabled) return;

  const cryptoData = await fetchInitialCryptoData();
  const asset = cryptoData.find(c => c.symbol === config.symbol);

  if (asset) {
    const currentPrice = asset.currentPrice;
    const gridSize = (config.upperLimit - config.lowerLimit) / config.gridLines;
    const currentGrid = Math.floor((currentPrice - config.lowerLimit) / gridSize);

    // Here you would implement the grid trading logic
    // This is a simplified version
    const shouldTrade = true; // Replace with actual grid logic
    const portfolio = await readPortfolio('default');

    if (shouldTrade) {
      const amount = config.investmentPerGrid;
      const quantity = amount / currentPrice;

      const updatedPortfolio = {
        ...portfolio,
        assets: [
          ...portfolio.assets.filter(a => a.symbol !== config.symbol),
          {
            symbol: config.symbol,
            quantity: (portfolio.assets.find(a => a.symbol === config.symbol)?.quantity || 0) + quantity,
            averagePrice: currentPrice
          }
        ]
      };

      await updatePortfolio('default', updatedPortfolio);
    }
  }
}

// Execute Stop Loss strategy
async function executeStopLoss(strategy: Strategy) {
  const config = strategy.config;
  if (!config.enabled) return;

  const portfolio = await readPortfolio('default');
  const cryptoData = await fetchInitialCryptoData();
  const asset = cryptoData.find(c => c.symbol === config.symbol);
  const portfolioAsset = portfolio.assets.find(a => a.symbol === config.symbol);

  if (asset && portfolioAsset) {
    const currentPrice = asset.currentPrice;
    const entryPrice = portfolioAsset.averagePrice;
    const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (priceChange <= -config.stopLoss || priceChange >= config.takeProfit) {
      // Sell all holdings
      const updatedPortfolio = {
        ...portfolio,
        assets: portfolio.assets.filter(a => a.symbol !== config.symbol)
      };

      await updatePortfolio('default', updatedPortfolio);
    }
  }
}

// Execute all strategies
export async function executeStrategies() {
  const strategies = readStrategies();
  
  for (const strategy of strategies) {
    if (!strategy.config.enabled) continue;

    switch (strategy.config.type) {
      case 'DCA':
        await executeDCA(strategy);
        break;
      case 'MOVING_AVERAGE':
        await executeMovingAverage(strategy);
        break;
      case 'GRID':
        await executeGridTrading(strategy);
        break;
      case 'STOP_LOSS':
        await executeStopLoss(strategy);
        break;
    }
  }
} 