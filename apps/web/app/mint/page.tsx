"use client";

import { useState } from "react";
import { useConnectedAddress } from "@/hooks/useWallet";
import { toast } from "sonner";
import { simulateAndSend, normalizeError } from "@/lib/simulateAndSend";
import { stellarErrorMessage } from "@/lib/stellarSdk";
import { contractIds } from "@/lib/stellar";

type FormState = {
  uri: string;
  royaltyBps: string;
  royaltyRecipient: string;
};

function defaultState(addr: string | null): FormState {
  return {
    uri: "",
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
      const result = await simulateAndSend({
        contractAddress: contractIds.nftCore,
        method: "mint",
        args: [address, form.uri, form.royaltyRecipient, Number(form.royaltyBps)],
        sourcePublicKey: address!,
      });

      if (result.status === "SUCCESS") {
        toast.success(
          `Minted! Token ID: ${result.result ?? "—"}  ·  tx: ${result.hash.slice(0, 12)}…`,
        );
        setForm(defaultState(address));
      } else {
        toast.error(`Transaction ${result.status.toLowerCase()}. Hash: ${result.hash.slice(0, 12)}…`);
      }
    } catch (e) {
      const err = normalizeError(e);
      toast.error(stellarErrorMessage(err).slice(0, 160));
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
          split; you&apos;ll receive proceeds in your wallet after each sale.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 bg-bg-surface rounded-xl border border-white/5 p-5 sm:p-6">
        <Field label="Metadata URI" hint="IPFS CID or HTTPS URL pointing to JSON metadata">
          <input
            className="w-full bg-bg-elevated border border-white/[0.06] rounded-lg px-3 py-2.5 text-gray-100 focus:outline-2 focus:outline-accent-soft focus:outline-offset-0"
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
            className="w-full bg-bg-elevated border border-white/[0.06] rounded-lg px-3 py-2.5 text-gray-100 focus:outline-2 focus:outline-accent-soft focus:outline-offset-0"
            type="number"
            min={0}
            max={10000}
            value={form.royaltyBps}
            onChange={(e) => setForm({ ...form, royaltyBps: e.target.value })}
          />
        </Field>

        <Field label="Royalty recipient" hint="Stellar address (G… or C…)">
          <input
            className="w-full font-mono bg-bg-elevated border border-white/[0.06] rounded-lg px-3 py-2.5 text-gray-100 focus:outline-2 focus:outline-accent-soft focus:outline-offset-0"
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
