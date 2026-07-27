"use client";

import { createContext, useContext, ReactNode } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";

import { WalletProvider, useWallet } from "@/hooks/useWallet";

const FetcherContext = createContext<((input: string) => Promise<unknown>) | null>(
  null,
);

/**
 * App-wide SWR fetcher. Hits our internal /api/* routes or the Soroban
 * RPC directly when given a URL that points there.
 */
const defaultFetcher: (input: string) => Promise<unknown> = async (input) => {
  if (input.startsWith("/api/")) {
    const res = await fetch(input);
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  const res = await fetch(input);
  if (!res.ok) {
    throw new Error(`External fetch failed: ${res.status}`);
  }
  return res.json();
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: defaultFetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      <WalletProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{ duration: 4000 }}
        />
        {children}
      </WalletProvider>
    </SWRConfig>
  );
}

export function useOptionalWallet() {
  return useWallet();
}
