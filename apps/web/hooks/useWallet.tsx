/**
 * Wallet hook — Freighter (browser) and a typed address contract.
 *
 * The hook returns a discriminated state to make the consumer's
 * `switch (state.kind)` exhaustive. We re-poll on window focus because
 * Freighter today does not expose an internal "account changed" event.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  getNetworkDetails,
  getPublicKey,
  isAllowed,
  isConnected,
  setAllowed,
} from "@stellar/freighter-api";
import { network, networkPassphrase } from "@/lib/stellar";
import { classifyError, StellarError } from "@/lib/stellarSdk";

export type WalletState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "connected"; address: string; network: string }
  | { kind: "error"; error: StellarError };

const WalletContext = createContext<{
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
} | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ kind: "idle" });

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const ok = await isConnected();
      if (!ok) {
        setState({ kind: "error", error: { kind: "wallet_not_installed" } });
        return;
      }
      await setAllowed();
      const allowed = await isAllowed();
      if (!allowed) {
        setState({ kind: "error", error: { kind: "wallet_rejected" } });
        return;
      }
      const address = await getPublicKey();
      const details = await getNetworkDetails();
      if (details.networkPassphrase !== networkPassphrase) {
        setState({
          kind: "error",
          error: {
            kind: "network_mismatch",
            expected: network,
            got: details.network,
          },
        });
        return;
      }
      setState({
        kind: "connected",
        address,
        network: details.network,
      });
    } catch (e) {
      setState({ kind: "error", error: classifyError(e) });
    }
  }, []);

  const connect = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => {
      if (state.kind === "connected") refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, state.kind]);

  const value = useMemo(
    () => ({ state, connect, disconnect, refresh }),
    [state, connect, disconnect, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

export function useConnectedAddress(): string | null {
  const { state } = useWallet();
  return state.kind === "connected" ? state.address : null;
}
