/**
 * Vitest setup — runs before every test file. Mocks out all Stellar
 * network-surface dependencies so component tests don't need the real
 * Freighter extension or a live Soroban RPC. The exact behaviour each
 * call would have is preserved (successes return the typed values a
 * production caller would expect) so tests exercise realistic paths.
 */

import "@testing-library/jest-dom/vitest";
import { vi, beforeEach } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(async () => true),
  isAllowed: vi.fn(async () => true),
  setAllowed: vi.fn(async () => true),
  getAddress: vi.fn(async () => ({
    address: "GBSAMPLEWALLETADDRESSXXXXXXXXXXXXXXXXXXXXXXXXX",
  })),
  getNetworkDetails: vi.fn(async () => ({
    network: "TESTNET",
    networkPassphrase: "Test SDF Network ; September 2015",
  })),
  signTransaction: vi.fn(async (xdr: string) => ({ signedTxXdr: `signed_${xdr}`, signerAddress: "G…" })),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    SorobanRpc: {
      Server: vi.fn().mockImplementation(() => ({
        getEvents: vi.fn(async () => ({
          events: [],
          latestLedger: 1,
        })),
        getTransaction: vi.fn(async () => ({
          status: "SUCCESS",
          ledger: 1,
        })),
        sendTransaction: vi.fn(async () => ({
          status: "PENDING",
          hash: "deadbeef",
        })),
        simulateTransaction: vi.fn(async () => ({
          results: [],
          footprint: "mock_footprint",
        })),
      })),
    },
    Contract: vi.fn().mockImplementation(() => ({
      call: vi.fn(async () => ({})),
    })),
    TransactionBuilder: {
      fromXDR: vi.fn(async () => ({})),
    },
    Address: {
      fromString: vi.fn((s: string) => ({ toString: () => s })),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});
