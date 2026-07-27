"use client";

import { useState } from "react";
import { NFTCard, NFTCardSkeleton, type NFTItem } from "@/components/NFTCard";
import { useConnectedAddress } from "@/hooks/useWallet";
import { toast } from "sonner";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/stellar";

const filterTabs: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "listing", label: "Listed" },
  { key: "auction", label: "Auctions" },
];

async function fetchMarketItems(): Promise<NFTItem[]> {
  const res = await fetch("/api/events/latest");
  if (!res.ok) return [];
  return res.json();
}

export default function MarketplacePage() {
  const [filter, setFilter] = useState("all");
  const connected = useConnectedAddress();

  const { data: items, isLoading } = useSWR<NFTItem[]>(
    SWR_KEYS.marketEvents(),
    fetchMarketItems,
    { refreshInterval: 10_000, fallbackData: [] },
  );

  const visible = (items ?? []).filter((it) =>
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

      {!connected && (
        <div className="rounded-lg p-4 bg-accent-muted/20 border border-accent/30 text-accent-soft text-sm">
          Connect Freighter to interact with listings (browsing is open).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <NFTCardSkeleton key={`sk-${i}`} />
          ))}

        {!isLoading && visible.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 text-sm">
            No {filter === "all" ? "" : filter + " "}items found on-chain yet.
          </div>
        )}

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
