"use client";

import clsx from "clsx";

export type NFTItem = {
  tokenId: string;
  nftContract: string;
  title: string;
  image?: string | null;
  owner?: string | null;
  price?: string | null;
  currency?: string | null;
  state: "listing" | "auction" | "none";
  endTimeMs?: number | null;
  highestBid?: string | null;
  uri?: string | null;
};

function formatTimeLeft(ms: number): string {
  if (ms < 0) return "ended";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function NFTCard({
  item,
  onClick,
}: {
  item: NFTItem;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group text-left rounded-xl overflow-hidden bg-bg-surface border border-white/5",
        "hover:border-accent/40 hover:-translate-y-0.5 transition-all",
      )}
    >
      <div className="aspect-square relative bg-gradient-to-br from-accent-muted via-accent to-bg-elevated">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-white/80">
              #{item.tokenId}
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          {item.state === "listing" ? (
            <span className="px-2 py-0.5 text-xs rounded-md bg-success/20 text-success border border-success/30">
              Listed
            </span>
          ) : item.state === "auction" ? (
            <span className="px-2 py-0.5 text-xs rounded-md bg-accent/20 text-accent-soft border border-accent/30">
              Auction
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-4 space-y-1.5">
        <h3 className="font-medium text-gray-100 truncate" title={item.title}>
          {item.title}
        </h3>
        <p className="text-xs text-gray-500 truncate">
          {item.uri ?? `stellar-bridge://nft/${item.tokenId}`}
        </p>
        <div className="flex items-end justify-between pt-1">
          <div className="text-sm">
            {item.state === "listing" && (
              <>
                <div className="text-gray-400 text-xs">Price</div>
                <div className="font-semibold text-gray-100">
                  {item.price ?? "—"}{" "}
                  <span className="text-xs text-gray-400">
                    {item.currency ?? "PAY"}
                  </span>
                </div>
              </>
            )}
            {item.state === "auction" && (
              <>
                <div className="text-gray-400 text-xs">Top bid</div>
                <div className="font-semibold text-gray-100">
                  {item.highestBid ?? "—"}{" "}
                  <span className="text-xs text-gray-400">
                    {item.currency ?? "PAY"}
                  </span>
                </div>
              </>
            )}
          </div>
          {item.state === "auction" && item.endTimeMs && (
            <span className="text-xs font-mono text-accent-soft">
              ⏱ {formatTimeLeft(item.endTimeMs - Date.now())}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function NFTCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-bg-surface border border-white/5">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 rounded skeleton" />
        <div className="h-3 w-1/2 rounded skeleton" />
        <div className="h-4 w-1/3 rounded skeleton mt-2" />
      </div>
    </div>
  );
}
