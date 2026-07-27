/**
 * WalletConnect component tests — cover the four discriminated states
 * (idle, loading, connected, error) so the UI's error handling logic can't
 * regress silently.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/hooks/useWallet";
import { WalletConnect } from "@/components/WalletConnect";

function TestHarness() {
  return (
    <WalletProvider>
      <WalletConnect />
      <WalletStateDebug />
    </WalletProvider>
  );
}

function WalletStateDebug() {
  const { state } = useWallet();
  return (
    <div data-testid="state-debug" data-state-kind={state.kind}>
      {state.kind === "connected" ? state.address : "no"}
    </div>
  );
}

beforeEach(() => cleanup());

describe("WalletConnect", () => {
  it("renders the connect prompt when idle", () => {
    render(<TestHarness />);
    expect(screen.getByRole("button", { name: /connect wallet/i }))
      .toBeInTheDocument();
    expect(screen.getByTestId("state-debug").dataset.stateKind).toBe("idle");
  });

  it("transitions to connected and shows shortened address", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    // The mock Freighter returns a sample public key instantly
    expect(await screen.findByTestId("state-debug")).toHaveAttribute(
      "data-state-kind",
      "connected",
    );
    // Address shortened as G…XXXX
    // Address shortened as GBSA…XXXX (first 4 + last 4 chars)
    expect(screen.getByText(/GBSA…XXXX/)).toBeInTheDocument();
  });

  it("shows error UI when wallet is rejected", async () => {
    const freighter = await import("@stellar/freighter-api");
    vi.mocked(freighter.isAllowed).mockRejectedValueOnce(
      new Error("User rejected access"),
    );
    render(<TestHarness />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(await screen.findByText(/Access denied/i)).toBeInTheDocument();
  });

  it("shows install prompt when Freighter not connected", async () => {
    const freighter = await import("@stellar/freighter-api");
    vi.mocked(freighter.isConnected).mockResolvedValueOnce(false as never);
    render(<TestHarness />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(await screen.findByText(/Install Freighter/i)).toBeInTheDocument();
  });
});
