"use client";

import { useState } from "react";
import { useConnectedAddress } from "@/hooks/useWallet";
import { toast } from "sonner";
import { simulateAndSend, normalizeError } from "@/lib/simulateAndSend";
import { contractIds } from "@/lib/stellar";

type FormState = {
  uri: string;
  royaltyBps: string;
  royaltyRecipient: string;
};

function defaultState(addr: string | null): FormState {
  return {
    uri: "ipfs://bafy…your-metadata-uri",
    royaltyBps: "500", // 5%
    royaltyRecipient: addr ?? "",
  };
}

export default function MintPage() {
  const address = useConnectedAddress();
  const [form, setForm] = useState<FormState>(defaultState(address));
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (!address) return "Connect your wallet first.";
    if (!form.uri.startsWith("ipfs://") && !form.uri.startsWith("https://"))
      return "URI must start with ipfs:// or https://";
    const bps = Number(form.royaltyBps);
    if (!Number.isFinite(bps) || bps < 0 || bps > 10000)
      return "Royalty bps must be between 0 and 10000 (0–100%).";
    if (!form.royaltyRecipient || form.royaltyRecipient.length < 8)
      return "Provide a valid royalty recipient address.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const issue = validate();
    if (issue) {
      toast.error(issue);
      return;
    }

    setSubmitting(true);
    try {
      // In production: simulateAndSend against NFT_CORE_ADDRESS mint().
      // For now we simulate a successful transaction so the UX is reviewable.
      await new Promise((r) => setTimeout(r, 600));
      toast.success(
        `Mock-mint queued for royalty recipient ${form.royaltyRecipient.slice(
          0,
          6,
        )}… at ${form.royaltyBps} bps`,
      );
    } catch (e) {
      const err = normalizeError(e);
      toast.error(
        err.kind === "contract_error"
          ? `Contract error: ${err.message.slice(0, 120)}`
          : err.kind === "wallet_rejected"
          ? "Wallet rejected the transaction"
          : err.kind === "rpc_unreachable"
          ? "Soroban RPC unreachable"
          : err.message ?? "Unexpected error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mint NFT</h1>
        <p className="text-gray-400 text-sm mt-1">
          Mint a new NFT on the Stellar Bridge collection. Set your royalty
          split; you'll receive proceeds in your wallet after each sale.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 bg-bg-surface rounded-xl border border-white/5 p-5 sm:p-6">
        <Field label="Metadata URI" hint="IPFS CID or HTTPS URL pointing to JSON metadata">
          <input
            className="input"
            value={form.uri}
            onChange={(e) => setForm({ ...form, uri: e.target.value })}
            placeholder="ipfs://bafy…"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Royalty (basis points)"
          hint="0–10000 (10000 = 100%). Sellers receive (price – royalty – fee)."
        >
          <input
            className="input"
            type="number"
            min={0}
            max={10000}
            value={form.royaltyBps}
            onChange={(e) => setForm({ ...form, royaltyBps: e.target.value })}
          />
        </Field>

        <Field label="Royalty recipient" hint="Stellar address (G… or C…)">
          <input
            className="input font-mono"
            value={form.royaltyRecipient}
            onChange={(e) =>
              setForm({ ...form, royaltyRecipient: e.target.value })
            }
            placeholder="G…"
          />
        </Field>

        <button
          disabled={submitting}
          type="submit"
          className="w-full sm:w-auto px-5 h-11 rounded-lg bg-accent hover:bg-accent-soft text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Minting…" : "Mint NFT"}
        </button>
      </form>

      {!address && (
        <p className="text-sm text-gray-500">
          Tip: connect Freighter to populate the recipient with your own address.
        </p>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          background: theme("colors.bg.elevated");
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          color: theme("colors.gray.100");
        }
        .input:focus {
          outline: 2px solid theme("colors.accent.soft");
          outline-offset: 0;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-gray-200">{label}</span>
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      {children}
    </label>
  );
}
