"use client";

import { useWallet } from "@/hooks/useWallet";
import clsx from "clsx";

function shorten(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletConnect() {
  const { state, connect, disconnect } = useWallet();

  const base =
    "text-sm font-medium px-3 sm:px-4 h-10 rounded-lg flex items-center justify-center gap-2 transition-colors";
  switch (state.kind) {
    case "idle":
      return (
        <button
          onClick={connect}
          className={clsx(base, "bg-accent hover:bg-accent-soft text-white")}
        >
          Connect Wallet
        </button>
      );
    case "loading":
      return (
        <button
          disabled
          className={clsx(base, "bg-white/5 text-gray-400 cursor-wait")}
        >
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse-soft" />
          Connecting…
        </button>
      );
    case "connected":
      return (
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-400 px-3 h-9 rounded-md bg-white/5 border border-white/5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {state.network}
          </span>
          <button
            onClick={disconnect}
            className={clsx(
              base,
              "bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-mono",
            )}
          >
            {shorten(state.address)}
          </button>
        </div>
      );
    case "error": {
      const msg =
        state.error.kind === "wallet_not_installed"
          ? "Install Freighter"
          : state.error.kind === "wallet_rejected"
          ? "Access denied"
            : state.error.kind === "network_mismatch"
            ? `Switch to ${state.error.expected}`
            : "Connect failed";
      return (
        <button
          onClick={connect}
          className={clsx(base, "bg-danger/15 hover:bg-danger/25 text-danger")}
          title={JSON.stringify(state.error)}
        >
          {msg}
        </button>
      );
    }
  }
}
