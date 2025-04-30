import { NextResponse } from 'next/server';
import { executeStrategies } from '@/lib/strategy-service';

export async function GET() {
  try {
    await executeStrategies();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error executing strategies:', error);
    return NextResponse.json(
      { error: 'Failed to execute strategies' },
      { status: 500 }
    );
  }
} 