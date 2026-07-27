"use client";

import { useParams } from "next/navigation";
import { NFTCard, type NFTItem } from "@/components/NFTCard";
import { useConnectedAddress } from "@/hooks/useWallet";
import Link from "next/link";
import { toast } from "sonner";

const sampleDetail: Record<string, NFTItem & { description?: string }> = {
  "12": {
    tokenId: "12",
    nftContract: "C-DEMO",
    title: "Astra #12",
    state: "listing",
    price: "100",
    currency: "PAY",
    uri: "ipfs://bafy…astra12",
    description:
      "A radiant celestial NFT from the Stellar Bridge Genesis collection.",
  },
  "9": {
    tokenId: "9",
    nftContract: "C-DEMO",
    title: "Helios #9",
    state: "auction",
    highestBid: "240",
    currency: "PAY",
    endTimeMs: Date.now() + 1000 * 60 * 60 * 4,
    uri: "ipfs://bafy…helios9",
    description: "A blazing solar NFT currently up for auction.",
  },
};

export default function NftDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const connected = useConnectedAddress();
  const item = sampleDetail[id];

  if (!item) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">NFT Not Found</h1>
        <p className="text-gray-400 text-sm">
          Token #{id} does not exist or hasn&apos;t been minted yet.
        </p>
        <Link
          href="/marketplace"
          className="inline-block px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm transition-colors"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <NFTCard item={item} />
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-gray-400 text-sm mt-2">{item.description}</p>
          )}
        </div>

        <div className="rounded-xl bg-bg-surface border border-white/5 p-4 space-y-3">
          <DetailRow label="Token ID" value={`#${item.tokenId}`} />
          <DetailRow label="Contract" value={item.nftContract} />
          <DetailRow label="Metadata" value={item.uri ?? "—"} mono />
          {item.state === "listing" && item.price && (
            <DetailRow
              label="Price"
              value={`${item.price} ${item.currency ?? "PAY"}`}
            />
          )}
          {item.state === "auction" && item.highestBid && (
            <DetailRow
              label="Highest Bid"
              value={`${item.highestBid} ${item.currency ?? "PAY"}`}
            />
          )}
        </div>

        {!connected && (
          <div className="rounded-lg p-4 bg-accent-muted/20 border border-accent/30 text-accent-soft text-sm">
            Connect Freighter to buy, bid, or list this NFT.
          </div>
        )}

        <button
          onClick={() => toast.info("On-chain actions coming with contract integration")}
          className="w-full px-5 h-11 rounded-lg bg-accent hover:bg-accent-soft text-white font-medium transition-colors"
        >
          {item.state === "listing"
            ? "Buy Now"
            : item.state === "auction"
            ? "Place Bid"
            : "List for Sale"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={mono ? "font-mono text-gray-200" : "text-gray-200"}>
        {value}
      </span>
    </div>
  );
}
