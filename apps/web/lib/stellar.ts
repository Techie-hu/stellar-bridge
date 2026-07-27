/**
 * Stellar network + contract address book.
 *
 * Reads contract addresses from `process.env.NEXT_PUBLIC_*` with safe
 * placeholders so the app renders (with degraded features) before deploy
 * addresses are filled in. All consumers should import `contractIds` and
 * never call env directly elsewhere.
 */

export type Network = "testnet" | "mainnet" | "futurenet";

export const network: Network =
  (process.env.NEXT_PUBLIC_NETWORK as Network) ?? "testnet";

export const networkPassphrase =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

export const sorobanRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ??
  "https://soroban-testnet.stellar.org";

export const horizonUrl =
  process.env.NEXT_PUBLIC_HORIZON_URL ??
  "https://horizon-testnet.stellar.org";

export type ContractIds = {
  nftCore: string;
  paymentToken: string;
  marketplace: string;
};

function placeholder(label: string): string {
  console.warn(
    `[stellar] Contract address missing for ${label}. Set NEXT_PUBLIC_${label
      .replace(/[A-Z]/g, (c) => `_${c}`)
      .toUpperCase()}_ADDRESS in .env.`,
  );
  return "C" + "0".repeat(55);
}

export const contractIds: ContractIds = {
  nftCore: process.env.NEXT_PUBLIC_NFT_CORE_ADDRESS ?? placeholder("nftCore"),
  paymentToken:
    process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ?? placeholder("paymentToken"),
  marketplace:
    process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ?? placeholder("marketplace"),
};

export function isContractsConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_NFT_CORE_ADDRESS &&
    !!process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS &&
    !!process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS
  );
}

export const SWR_KEYS = {
  listing: (nft: string, tokenId: string | number) =>
    ["marketplace", "get_listing", nft, String(tokenId)] as const,
  auction: (nft: string, tokenId: string | number) =>
    ["marketplace", "get_auction", nft, String(tokenId)] as const,
  nftOwner: (nft: string, tokenId: string | number) =>
    ["nft", "owner_of", nft, String(tokenId)] as const,
  nftUri: (nft: string, tokenId: string | number) =>
    ["nft", "token_uri", nft, String(tokenId)] as const,
  royalty: (nft: string, tokenId: string | number) =>
    ["nft", "royalty_info", nft, String(tokenId)] as const,
  marketEvents: () => ["api", "events", "stream"] as const,
};
