import { NextRequest, NextResponse } from "next/server";

// Proxy to CoinGecko's market_chart endpoint for historical price data
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const searchParams = req.nextUrl.searchParams;
  const days = searchParams.get("days") || "7";
  const vs_currency = searchParams.get("vs_currency") || "usd";

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${days}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching chart data" }, { status: 500 });
  }
} 