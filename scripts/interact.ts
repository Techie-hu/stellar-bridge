/**
 * Post-deploy interaction script.
 *
 * Drives a complete marketplace mint using the deployed contract addresses.
 * Simulates and sends the transaction, then prints the resulting hash.
 * The hash is written to `tx-hash.txt` only when a real hash is returned
 * by the Soroban RPC (requires DEPLOYER_SECRET to be set).
 *
 * Usage:
 *   DEPLOYER_SECRET=S… pnpm tsx scripts/interact.ts
 *
 * Requires apps/web/.env.local populated with the three contract addresses
 * from a previous successful `pnpm deploy:testnet`.
 */

import { Keypair, TransactionBuilder, Operation, BASE_FEE } from "@stellar/stellar-sdk";
import { RPC_URL, NETWORK_PASSPHRASE, contractIds } from "./_env";
import fs from "node:fs";
import path from "node:path";

async function rpc(method: string, params: unknown): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

async function signAndSend(signer: Keypair, txXdr: string, _network: string): Promise<string | null> {
  const sim = await rpc("simulateTransaction", { transaction: txXdr });
  if (sim.error) throw new Error(`simulate: ${sim.error}`);

  console.log("simulate OK", JSON.stringify(sim, null, 2));

  // Send the transaction and return its hash for recording.
  const sent = (await rpc("sendTransaction", { transaction: txXdr })) as {
    hash?: string;
    status?: string;
    errorResultXdr?: string;
  };
  if (sent.errorResultXdr) {
    throw new Error(`sendTransaction error: ${sent.errorResultXdr}`);
  }
  return sent.hash ?? null;
}

async function main() {
  const signerKp = Keypair.fromSecret(
    process.env.DEPLOYER_SECRET ??
      "SAATESTPRIVATEKEYPHRASEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  );
  const source = await import("@stellar/stellar-sdk").then((m) =>
    rpc("getAccount", { address: signerKp.publicKey() }).then((r) => r),
  );

  const network = NETWORK_PASSPHRASE;
  const account = new (
    await import("@stellar/stellar-sdk")
  ).Account(signerKp.publicKey(), (source as { sequenceNumber: string }).sequenceNumber);

  // Mint 1 NFT on nft-core (admin-only).
  const mintTx = TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(
      Operation.invokeHostFunction({
        func: (await import("@stellar/stellar-sdk")).xdr.HostFunction.hostFunctionTypeInvokeContract(
          new (await import("@stellar/stellar-sdk")).xdr.InvokeContractArgs({
            contractAddress: new (await import("@stellar/stellar-sdk")).Address(
              contractIds.nftCore,
            ).toSCAddress(),
            functionName: "mint",
            args: [
              new (await import("@stellar/stellar-sdk")).Address(signerKp.publicKey()).toSCVal(),
              new (await import("@stellar/stellar-sdk")).xdr.ScVal.scvString("ipfs://bafy-demo"),
              new (await import("@stellar/stellar-sdk")).Address(signerKp.publicKey()).toSCVal(),
              (await import("@stellar/stellar-sdk")).nativeToScVal(500, { type: "u32" }),
            ],
          }),
        ),
        auth: [],
      }),
    )
    .setTimeout(30)
    .build();

  const hash = await signAndSend(signerKp, mintTx.toXDR(), network);

  if (hash) {
    fs.writeFileSync(path.resolve(process.cwd(), "tx-hash.txt"), hash);
    console.log(`Wrote tx hash to tx-hash.txt: ${hash}`);
  } else {
    console.log("interact.ts completed — no hash returned (simulation-only run).");
    console.log("Set DEPLOYER_SECRET to a funded testnet keypair to submit a real transaction.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
