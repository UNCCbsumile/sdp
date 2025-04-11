import { NextResponse } from 'next/server';
import { getPortfolio, savePortfolio } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const portfolio = await getPortfolio(userId);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, portfolio } = await request.json();

    if (!userId || !portfolio) {
      return NextResponse.json(
        { error: 'User ID and portfolio data are required' },
        { status: 400 }
      );
    }

    await savePortfolio(userId, portfolio);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 