import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MarketOverview from "@/components/market-overview";
import type { CryptoData } from "@/types/crypto";

const mockCryptoData: CryptoData[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "",
    currentPrice: 50000,
    marketCap: 1000000000000,
    totalVolume: 50000000000,
    priceChangePercentage24h: 2.5,
    sparklineIn7d: { price: [50000, 51000, 49000, 52000, 50500] }
  }
];

describe("MarketOverview", () => {
  it("shows 'Simulated Data' when live data is unavailable", () => {
    render(
      <MarketOverview
        cryptoData={mockCryptoData}
        isLoading={false}
        isLiveData={false}
        error={null}
      />
    );
    // Check for the Simulated Data badge
    const badge = screen.getByText(/Simulated Data/i);
    expect(badge).toBeInTheDocument();
    // Check for the actual class on the parent element
    expect(badge.parentElement).toHaveClass("flex items-center gap-2");
  });
}); 