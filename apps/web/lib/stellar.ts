/**
 * Stellar network + contract address book.
 *
 * Reads contract addresses from `process.env.NEXT_PUBLIC_*`.
 * Falls back to the live testnet deployment addresses so the app works
 * immediately without a local .env.local. All consumers should import
 * `contractIds` and never call env directly elsewhere.
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

// Deployed testnet contract addresses (Soroban testnet, July 2026).
// Override with NEXT_PUBLIC_*_ADDRESS in .env.local when redeploying.
const DEPLOYED_NFT_CORE    = "CAWODCYRVKAMWDT3ELKSHCAFQ7IJNA6ILPG2H7NAX4JFMWHCBSTHEUPN";
const DEPLOYED_PAYMENT     = "CCMDQ7INMIPVSSWW3N7WL664SQYL274EXUMCXQX4LWP665OF5M5TQBZL";
const DEPLOYED_MARKETPLACE = "CCDP4TYNN6K4X6CCHUHVZLUZHZYENAEDXLQQN35VIS4INYOZNOAWWFC5";

// Use || instead of ?? here: on Vercel, unset NEXT_PUBLIC_* env vars are
// inlined as empty strings "" at build time, which ?? does not catch.
export const contractIds: ContractIds = {
  nftCore:      process.env.NEXT_PUBLIC_NFT_CORE_ADDRESS      || DEPLOYED_NFT_CORE,
  paymentToken: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS || DEPLOYED_PAYMENT,
  marketplace:  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS   || DEPLOYED_MARKETPLACE,
};

export function isContractsConfigured(): boolean {
  return true; // real addresses are always available via DEPLOYED_* fallbacks
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
