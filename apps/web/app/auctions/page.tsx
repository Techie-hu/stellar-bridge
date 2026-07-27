"use client";

import { useState } from "react";
import { NFTCard, NFTCardSkeleton, type NFTItem } from "@/components/NFTCard";
import { useConnectedAddress } from "@/hooks/useWallet";
import { toast } from "sonner";

const sampleAuctions: NFTItem[] = [
  {
    tokenId: "9",
    nftContract: "C-DEMO",
    title: "Helios #9",
    state: "auction",
    highestBid: "240",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 60 * 4,
    uri: "ipfs://bafy…helios9",
  },
  {
    tokenId: "42",
    nftContract: "C-DEMO",
    title: "Void #42",
    state: "auction",
    highestBid: "1_200",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 14,
    uri: "ipfs://bafy…void42",
  },
  {
    tokenId: "17",
    nftContract: "C-DEMO",
    title: "Nova #17",
    state: "auction",
    highestBid: "550",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 60 * 24,
    uri: "ipfs://bafy…nova17",
  },
];

export default function AuctionsPage() {
  const connected = useConnectedAddress();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Live Auctions
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          English auctions with anti-snipe protection. Place bids in real time.
        </p>
      </div>

      {!connected && (
        <div className="rounded-lg p-4 bg-accent-muted/20 border border-accent/30 text-accent-soft text-sm">
          Connect Freighter to place bids on active auctions.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sampleAuctions.map((item) => (
          <NFTCard
            key={item.tokenId}
            item={item}
            onClick={() =>
              toast.info(
                `${item.title} — bid panel coming online with contract integration`,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
