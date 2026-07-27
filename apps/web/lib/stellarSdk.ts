/**
 * Singletons for connecting to Soroban RPC and Horizon. Calling more than
 * once per process returns the cached instance — avoids leaking `fetch`
 * sockets and saturating the RPC during HMR or React Strict Mode dev runs.
 */

import { SorobanRpc } from "@stellar/stellar-sdk";
import { horizonUrl, sorobanRpcUrl } from "./stellar";

let rpcSingleton: SorobanRpc.Server | null = null;
let horizonSingleton: { server: string } | null = null;

export function getRpc(): SorobanRpc.Server {
  if (!rpcSingleton) {
    rpcSingleton = new SorobanRpc.Server(sorobanRpcUrl, {
      allowHttp: sorobanRpcUrl.startsWith("http://"),
    });
  }
  return rpcSingleton;
}

export function getHorizonUrl(): string {
  if (!horizonSingleton) {
    horizonSingleton = { server: horizonUrl };
  }
  return horizonSingleton.server;
}

/**
 * Friendly error type for any failure that bubbles up to the UI.
 * Discriminated union so consumers can render context-specific messages.
 */
export type StellarError =
  | { kind: "wallet_not_installed" }
  | { kind: "wallet_locked" }
  | { kind: "wallet_rejected" }
  | { kind: "network_mismatch"; expected: string; got: string }
  | { kind: "rpc_unreachable"; message: string }
  | { kind: "contract_error"; code: number; message: string }
  | { kind: "unknown"; message: string };

export function classifyError(e: unknown): StellarError {
  const msg = (e instanceof Error ? e.message : String(e)).slice(0, 320);
  if (/Freighter|extension|window\.freighter/i.test(msg))
    return { kind: "wallet_not_installed" };
  if (/User rejected|denied|reject/i.test(msg))
    return { kind: "wallet_rejected" };
  if (/network passphrase/i.test(msg))
    return { kind: "network_mismatch", expected: "TESTNET", got: "?" };
  if (/fetch|network|ECONNREFUSED/i.test(msg))
    return { kind: "rpc_unreachable", message: msg };
  if (/contract|scval|Account|Tx/i.test(msg))
    return { kind: "contract_error", code: -1, message: msg };
  return { kind: "unknown", message: msg };
}
