import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STRATEGIES_FILE = path.join(process.cwd(), 'data/strategies.json');

export async function POST() {
  try {
    // Reset strategies to empty array
    fs.writeFileSync(STRATEGIES_FILE, JSON.stringify([]));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting strategies:', error);
    return NextResponse.json(
      { error: 'Failed to reset strategies' },
      { status: 500 }
    );
  }
} 