/**
 * .env loader shared across scripts. Reads from the closest .env.local /
 * .env without external dependencies so we keep the deploy scripts
 * dependency-free for easy CI forks.
 */

import fs from "node:fs";
import path from "node:path";

function load(envFile: string): Record<string, string> {
  if (!fs.existsSync(envFile)) return {};
  const data = fs.readFileSync(envFile, "utf8");
  return Object.fromEntries(
    data
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [k, v] = line.split("=");
        return [k.trim(), v?.trim() ?? ""];
      }),
  );
}

const here = path.resolve(process.cwd());
const env = {
  ...load(path.join(here, ".env")),
  ...load(path.join(here, ".env.local")),
};

export const RPC_URL =
  env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const HORIZON_URL =
  env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
export const ADMIN = env.DEPLOYER_SECRET ? "(set)" : "(unset)";
export const contractIds = {
  nftCore: env.NFT_CORE_ADDRESS ?? "",
  paymentToken: env.PAYMENT_TOKEN_ADDRESS ?? "",
  marketplace: env.MARKETPLACE_ADDRESS ?? "",
};
