"use client";

import { useState } from "react";
import { NFTCard, NFTCardSkeleton, type NFTItem } from "@/components/NFTCard";
import { useConnectedAddress } from "@/hooks/useWallet";
import { isContractsConfigured } from "@/lib/stellar";
import { toast } from "sonner";

const filterTabs: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "listing", label: "Listed" },
  { key: "auction", label: "Auctions" },
];

/**
 * Without deployed contracts we render sample data so the UI is reviewable
 * on a fresh clone. Once env vars are set, the live Soroban feed takes
 * over (typically via a useSWR call against /api/events/stream).
 */
const sampleItems: NFTItem[] = [
  {
    tokenId: "12",
    nftContract: "C-DEMO",
    title: "Astra #12",
    state: "listing",
    price: "100",
    currency: "PAY",
    uri: "ipfs://bafy…astra12",
  },
  {
    tokenId: "9",
    nftContract: "C-DEMO",
    title: "Helios #9",
    state: "auction",
    highestBid: "240",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 60 * 4 + 5000,
    uri: "ipfs://bafy…helios9",
  },
  {
    tokenId: "21",
    nftContract: "C-DEMO",
    title: "Lumen #21",
    state: "listing",
    price: "55",
    currency: "PAY",
    uri: "ipfs://bafy…lumen21",
  },
  {
    tokenId: "42",
    nftContract: "C-DEMO",
    title: "Void #42",
    state: "auction",
    highestBid: "1_200",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 14 + 5000,
    uri: "ipfs://bafy…void42",
  },
];

export default function MarketplacePage() {
  const [filter, setFilter] = useState("all");
  const connected = useConnectedAddress();
  const ready = isContractsConfigured();

  const visible = sampleItems.filter((it) =>
    filter === "all" ? true : it.state === filter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Marketplace
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Live listings and auctions. New bids stream in real time.
          </p>
        </div>
        <div className="inline-flex p-1 rounded-lg bg-bg-surface border border-white/5 text-sm w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={
                filter === tab.key
                  ? "px-3 py-1.5 rounded-md bg-accent text-white"
                  : "px-3 py-1.5 rounded-md text-gray-300 hover:text-white"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!ready && (
        <div className="rounded-lg p-4 bg-warning/10 border border-warning/30 text-warning text-sm">
          ⚠ Contract addresses not configured. Showing sample data only. Set
          <code className="px-1 mx-1 rounded bg-warning/20">NEXT_PUBLIC_*_ADDRESS</code>
          in <code>apps/web/.env.local</code> and reload.
        </div>
      )}

      {!connected && (
        <div className="rounded-lg p-4 bg-accent-muted/20 border border-accent/30 text-accent-soft text-sm">
          Connect Freighter to interact with listings (browsing is open).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* While live data wires up, render skeletons so layout is realistic */}
        {Array.from({ length: 4 }).map((_, i) => (
          <NFTCardSkeleton key={`sk-${i}`} />
        ))}
        {visible.map((item) => (
          <NFTCard
            key={item.tokenId}
            item={item}
            onClick={() =>
              toast.info(`${item.title} — detail page coming online`)
            }
          />
        ))}
      </div>
    </div>
  );
}
