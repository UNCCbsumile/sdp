import { NextResponse } from 'next/server';
import { Strategy } from '@/types/strategy';
import path from 'path';
import fs from 'fs';

const STRATEGIES_FILE = path.join(process.cwd(), 'data/strategies.json');

// Helper to ensure strategies file exists
function ensureStrategiesFile() {
  if (!fs.existsSync(STRATEGIES_FILE)) {
    fs.writeFileSync(STRATEGIES_FILE, JSON.stringify([]));
  }
}

// Helper to read strategies
function readStrategies(): Strategy[] {
  ensureStrategiesFile();
  const data = fs.readFileSync(STRATEGIES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Helper to write strategies
function writeStrategies(strategies: Strategy[]) {
  ensureStrategiesFile();
  fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(strategies, null, 2));
}

export async function GET() {
  try {
    const strategies = readStrategies();
    return NextResponse.json(strategies);
  } catch (error) {
    console.error('Error reading strategies:', error);
    return NextResponse.json(
      { error: 'Failed to read strategies' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const strategy: Strategy = await request.json();
    const strategies = readStrategies();
    
    // Find if there's an existing strategy for the same symbol
    const existingStrategyIndex = strategies.findIndex(
      s => s.config.symbol === strategy.config.symbol
    );
    
    if (existingStrategyIndex !== -1) {
      // Replace the existing strategy for this symbol
      strategies[existingStrategyIndex] = strategy;
    } else {
      // Add new strategy
      strategies.push(strategy);
    }
    
    writeStrategies(strategies);
    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Error saving strategy:', error);
    return NextResponse.json(
      { error: 'Failed to save strategy' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    let strategies = readStrategies();
    strategies = strategies.filter(s => s.id !== id);
    writeStrategies(strategies);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return NextResponse.json(
      { error: 'Failed to delete strategy' },
      { status: 500 }
    );
  }
} 