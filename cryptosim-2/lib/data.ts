import fs from 'fs';
import path from 'path';

const USERS_DIR = path.join(process.cwd(), 'data/users');
const PORTFOLIOS_DIR = path.join(process.cwd(), 'data/portfolios');

// Ensure directories exist
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}
if (!fs.existsSync(PORTFOLIOS_DIR)) {
  fs.mkdirSync(PORTFOLIOS_DIR, { recursive: true });
}

export interface User {
  id: string;
  email: string;
  name: string;
  password: string; // In a real app, this should be hashed
}

export interface Portfolio {
  symbol: string;
  name: string;
  amount: number;
  averagePrice: number;
  transactions: Array<{
    type: 'buy' | 'sell';
    symbol: string;
    amount: number;
    price: number;
    timestamp: string;
  }>;
}

// User operations
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find(user => user.email === email) || null;
}

export async function getAllUsers(): Promise<User[]> {
  const files = fs.readdirSync(USERS_DIR);
  return files.map(file => {
    const content = fs.readFileSync(path.join(USERS_DIR, file), 'utf-8');
    return JSON.parse(content);
  });
}

export async function saveUser(user: User): Promise<void> {
  const filePath = path.join(USERS_DIR, `${user.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(user, null, 2));
}

// Portfolio operations
export async function getPortfolio(userId: string): Promise<Portfolio[]> {
  const filePath = path.join(PORTFOLIOS_DIR, `${userId}.json`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }
  return [{
    symbol: "USD",
    name: "US Dollar",
    amount: 10000,
    averagePrice: 1,
    transactions: [],
  }];
}

export async function savePortfolio(userId: string, portfolio: Portfolio[]): Promise<void> {
  const filePath = path.join(PORTFOLIOS_DIR, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(portfolio, null, 2));
} 