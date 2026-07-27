/**
 * NFTCard component tests — pinning the visual contract for marketplace
 * rendering and asserting that listings, auctions, and skeletons each
 * surface the expected discriminator UI.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NFTCard, NFTCardSkeleton } from "@/components/NFTCard";

beforeEach(() => cleanup());


describe("NFTCard listings", () => {
  it("shows price label and currency for a fixed-price listing", () => {
    render(
      <NFTCard
        item={{
          tokenId: "12",
          nftContract: "C-DEMO",
          title: "Astra #12",
          state: "listing",
          price: "100",
          currency: "PAY",
          uri: "ipfs://bafy…astra12",
        }}
      />,
    );
    expect(screen.getByText("Astra #12")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/PAY/)).toBeInTheDocument();
    expect(screen.getByText(/Listed/i)).toBeInTheDocument();
  });
});

describe("NFTCard auctions", () => {
  it("shows top bid label and time-remaining for an auction", () => {
    const inFuture = Date.now() + 1000 * 60 * 60 * 24;
    render(
      <NFTCard
        item={{
          tokenId: "9",
          nftContract: "C-DEMO",
          title: "Helios #9",
          state: "auction",
          highestBid: "240",
          currency: "PAY",
          endTimeMs: inFuture,
          uri: "ipfs://bafy…helios9",
        }}
      />,
    );
    expect(screen.getByText(/Top bid/i)).toBeInTheDocument();
    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText(/Auction/i)).toBeInTheDocument();
    // 24 hours from now → "24:00:00" format
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});

describe("NFTCardSkeleton", () => {
  it("renders a non-interactive placeholder", () => {
    render(<NFTCardSkeleton />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
