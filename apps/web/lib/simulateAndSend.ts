/**
 * High-level transaction lifecycle for Soroban contract calls.
 *
 *   1. Build a contract call against `contractAddress.method(args)`.
 *   2. Use the wallet-supplied public key as the source account.
 *   3. simulateTransaction to learn the footprint and resource fee.
 *   4. assembleTransaction with the simulation footprint (Soroban
 *      classic RPC pattern).
 *   5. Send to Freighter for signing.
 *   6. sendTransaction then poll getTransaction until SUCCESS/FAILED.
 *
 * We deliberately do NOT trust any of these calls in the client. Returned
 * values are surfaced verbatim to the caller with no post-processing.
 */

import {
  SorobanRpc,
  TransactionBuilder,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  Account,
} from "@stellar/stellar-sdk";

import {
  getRpc,
  classifyError,
  StellarError,
} from "./stellarSdk";
import { network, networkPassphrase, sorobanRpcUrl } from "./stellar";
import { signTransaction } from "@stellar/freighter-api";

export type SendArgs = {
  contractAddress: string;
  method: string;
  args?: unknown[];
  sourcePublicKey: string;
};

export type SendResult = {
  status: "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND";
  hash: string;
  result?: unknown;
};

export async function buildContractCall({
  contractAddress,
  method,
  args = [],
}: Pick<SendArgs, "contractAddress" | "method" | "args">) {
  const contract = new Contract(contractAddress);
  return contract.call(method, ...args.map((a) => nativeToScVal(a)));
}

export async function simulateAndSend(args: SendArgs): Promise<SendResult> {
  const rpc = getRpc();

  // Fetch the source account from the network to get the current sequence number.
  const sourceAccount = await rpc.getAccount(args.sourcePublicKey);
  const source = new Account(
    args.sourcePublicKey,
    sourceAccount.sequenceNumber(),
  );

  const op = await buildContractCall(args);

  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if ("errorResult" in sim && sim.errorResult) {
    throw new Error(`Simulation failed: ${JSON.stringify(sim.errorResult)}`);
  }

  const prepared = await rpc.prepareTransaction(tx);
  const xdr = prepared.toXDR();

  const signedResult = await signTransaction(xdr, { networkPassphrase });
  const signedTxXdr = typeof signedResult === "string" ? signedResult : signedResult.signedTxXdr;

  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    networkPassphrase,
  );
  const sent = await rpc.sendTransaction(signedTx);
  const hash = sent.hash;
  if (sent.status === "ERROR") {
    return { status: "FAILED", hash };
  }

  // Poll until terminal status.
  for (let i = 0; i < 30; i++) {
    const polled = await rpc.getTransaction(hash);
    if (polled.status === "SUCCESS") {
      return {
        status: "SUCCESS",
        hash,
        result: polled.returnValue
          ? scValToNative(polled.returnValue)
          : undefined,
      };
    }
    if (polled.status === "FAILED") {
      return { status: "FAILED", hash };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { status: "NOT_FOUND", hash };
}

/** Wrap an error path so UI surfaces a typed StellarError, never `any`. */
export function normalizeError(e: unknown): StellarError {
  return classifyError(e);
}

export const _internal = { network, sorobanRpcUrl };
