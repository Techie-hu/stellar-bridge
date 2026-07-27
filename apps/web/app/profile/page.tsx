"use client";

import { useConnectedAddress } from "@/hooks/useWallet";
import Link from "next/link";

export default function ProfilePage() {
  const address = useConnectedAddress();

  if (!address) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <div className="inline-block h-16 w-16 rounded-full bg-accent-muted/30 border border-accent/20" />
        <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-gray-400 text-sm">
          Connect Freighter to view your NFTs, listings, and auction activity.
        </p>
        <Link
          href="/marketplace"
          className="inline-block px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-accent-muted/40 border border-accent/20 flex items-center justify-center text-lg font-bold text-accent-soft">
          {address.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm font-mono text-gray-400">{address}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Owned NFTs", value: "—" },
          { label: "Listings", value: "—" },
          { label: "Active Bids", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-bg-surface border border-white/5 p-4 text-center"
          >
            <div className="text-2xl font-bold text-gray-100">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-bg-surface border border-white/5 p-8 text-center text-gray-500">
        <p className="text-sm">
          Your portfolio will appear here once contract integration is live.
        </p>
        <p className="text-xs mt-2 text-gray-600">
          Set NEXT_PUBLIC_CONTRACT_ADDRESSES in .env to enable on-chain data.
        </p>
      </div>
    </div>
  );
}
