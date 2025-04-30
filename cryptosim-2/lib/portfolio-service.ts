import path from 'path';
import fs from 'fs';

const PORTFOLIO_FILE = path.join(process.cwd(), 'data/portfolios');

interface PortfolioAsset {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

interface Portfolio {
  id: string;
  name: string;
  assets: PortfolioAsset[];
}

// Helper to ensure portfolios directory exists
function ensurePortfoliosDirectory() {
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    fs.mkdirSync(PORTFOLIO_FILE, { recursive: true });
  }
}

// Read portfolio for a user
export async function readPortfolio(userId: string): Promise<Portfolio> {
  ensurePortfoliosDirectory();
  const filePath = path.join(PORTFOLIO_FILE, `${userId}.json`);

  if (!fs.existsSync(filePath)) {
    // Create default portfolio if it doesn't exist
    const defaultPortfolio: Portfolio = {
      id: userId,
      name: 'Default Portfolio',
      assets: []
    };
    fs.writeFileSync(filePath, JSON.stringify(defaultPortfolio, null, 2));
    return defaultPortfolio;
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Update portfolio for a user
export async function updatePortfolio(userId: string, portfolio: Portfolio): Promise<void> {
  ensurePortfoliosDirectory();
  const filePath = path.join(PORTFOLIO_FILE, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(portfolio, null, 2));
} 