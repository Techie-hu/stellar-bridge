/**
 * MintForm tests — ensures the page validates inputs and surfaces
 * errors via the toast surface.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

let mockAddress: string | null = null;

vi.mock("@/hooks/useWallet", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useWallet")>(
    "@/hooks/useWallet",
  );
  return {
    ...actual,
    useConnectedAddress: () => mockAddress,
  };
});

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/simulateAndSend", () => ({
  simulateAndSend: vi.fn(),
  normalizeError: vi.fn(),
}));

import MintPage from "@/app/mint/page";
import { toast } from "sonner";

beforeEach(() => {
  mockAddress = null;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("MintPage form validation", () => {
  it("shows wallet error when wallet is not connected", () => {
    render(<MintPage />);
    fireEvent.click(screen.getByRole("button", { name: /mint nft/i }));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/wallet|connect/i),
    );
  });

  it("rejects invalid URI prefix even when wallet is connected", () => {
    mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    render(<MintPage />);

    // Change URI to something invalid
    const uriInput = screen.getByPlaceholderText("ipfs://bafy…");
    fireEvent.change(uriInput, { target: { value: "not-a-valid-uri" } });

    fireEvent.click(screen.getByRole("button", { name: /mint nft/i }));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/uri/i),
    );
  });

  it("offers a tip when wallet is not connected", () => {
    render(<MintPage />);
    expect(screen.getByText(/connect Freighter/i)).toBeInTheDocument();
  });
});
