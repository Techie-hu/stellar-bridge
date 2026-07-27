/**
 * Deploy all three Soroban contracts to Stellar testnet.
 *
 * Uses simulation return values to extract WASM hashes and contract IDs
 * (avoids XDR parser version mismatch in getTransaction).
 *
 * Usage:
 *   DEPLOYER_SECRET=S… pnpm tsx scripts/deploy.ts
 *
 * Prerequisites:
 *   1. Fund the deployer account on testnet
 *   2. Run `cargo build --target wasm32-unknown-unknown --release` first
 */

import {
  Keypair,
  Account,
  TransactionBuilder,
  Operation,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const TARGET_DIR = path.resolve(process.cwd(), "target", "wasm32-unknown-unknown", "release");

function loadWasm(name: string): Buffer {
  const file = path.join(TARGET_DIR, `${name}.wasm`);
  if (!fs.existsSync(file))
    throw new Error(`WASM not found at ${file}`);
  return fs.readFileSync(file);
}

/** Raw JSON-RPC poll — only checks `status` to avoid SDK XDR parsing. */
async function waitForTxSuccess(hash: string, label: string): Promise<void> {
  const resp = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash },
    }),
  });
  const body = await resp.json();
  const result = body.result;
  if (!result) throw new Error(`RPC error for ${label}: ${JSON.stringify(body)}`);

  for (let i = 0; i < 90; i++) {
    if (result.status === "SUCCESS") {
      console.log(`  ✓ ${label} confirmed`);
      return;
    }
    if (result.status === "FAILED") {
      throw new Error(`${label} FAILED: ${result.resultXdr?.slice(0, 80) ?? "no_result"}`);
    }
    if (i === 0) console.log(`  Waiting for ${label}...`);
    await new Promise((r) => setTimeout(r, 2000));

    // Re-poll
    const resp2 = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTransaction", params: { hash },
      }),
    });
    const body2 = await resp2.json();
    Object.assign(result, body2.result);
  }
  throw new Error(`${label} timeout`);
}

/** Simulate, sign, send, and wait for confirmation. Returns the sim result (for returnValue). */
async function simSignSend(
  server: SorobanRpc.Server,
  keypair: Keypair,
  op: xdr.Operation,
  label: string,
): Promise<any> {
  const account = await server.getAccount(keypair.publicKey());
  const source = new Account(keypair.publicKey(), account.sequenceNumber());
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op).setTimeout(30).build();

  const sim = await server.simulateTransaction(tx);
  if (sim.error) throw new Error(`${label} sim: ${JSON.stringify(sim.error)}`);

  const prep = await server.prepareTransaction(tx);
  prep.sign(keypair);
  const sent = await server.sendTransaction(prep);
  if (sent.status === "ERROR")
    throw new Error(`${label} send: ${sent.errorResult?.result?.code ?? "ERROR"}`);

  await waitForTxSuccess(sent.hash, label);
  return sim;
}

function extractScValBytes(scval: any): Buffer | null {
  if (!scval) return null;
  try {
    // Use scValToNative from v16.x SDK
    const native = scValToNative(scval);
    if (Buffer.isBuffer(native)) return native;
    if (native instanceof Uint8Array) return Buffer.from(native);
    if (typeof native === "string") {
      const b = Buffer.from(native, "hex");
      if (b.length === 32 || b.length === 64) return b;
    }
  } catch {}
  // Manual fallback: _arm="bytes", _value=Buffer|{type:"Buffer",data:[...]}
  try {
    if (scval._arm === "bytes" && scval._value != null) {
      if (Buffer.isBuffer(scval._value)) return scval._value;
      if (scval._value.type === "Buffer" && Array.isArray(scval._value.data))
        return Buffer.from(scval._value.data);
    }
    if (scval?.bytes) return Buffer.from(scval.bytes, "base64");
    if (scval?.value && typeof scval.value === "string") return Buffer.from(scval.value, "base64");
  } catch {}
  return null;
}

/** Compute the contract address from deployer public key and salt. */
function computeContractAddress(pubKey: string, salt: Buffer): string {
  const deployerAddr = new Address(pubKey);
  const fromAddr = new xdr.ContractIdPreimageFromAddress({
    address: deployerAddr.toScAddress(),
    salt: xdr.Hash.fromXDR(salt),
  });
  const preimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(fromAddr);
  const hash = crypto.createHash("sha256").update(preimage.toXDR()).digest();
  return Address.contract(hash).toString();
}

async function deployContract(
  server: rpc.Server,
  keypair: Keypair,
  wasm: Buffer,
  label: string,
): Promise<string> {
  console.log(`\n── ${label} ──`);
  const deployerAddr = new Address(keypair.publicKey());

  // Deterministic salt ensures consistent contract address
  const saltInput = `${label}:${keypair.publicKey()}:3`;
  const salt = crypto.createHash("sha256").update(saltInput).digest();
  const expectedAddr = computeContractAddress(keypair.publicKey(), salt);
  console.log(`  Expected address: ${expectedAddr.slice(0, 16)}…`);

  // ── Upload WASM ──
  console.log(`  Uploading WASM...`);
  const uploadOp = Operation.uploadContractWasm({ wasm });
  const sim = await simSignSend(server, keypair, uploadOp, `${label} upload`);

  // Extract WASM hash from simulation result.retval (ScVal Bytes)
  const simResult = sim as any;
  const retval = simResult.result?.retval ?? simResult.retval;
  if (!retval) throw new Error(`No simulation return value for ${label} upload`);

  const wasmHash = extractScValBytes(retval);
  if (!wasmHash || wasmHash.length !== 32)
    throw new Error(`Invalid WASM hash for ${label} (got ${wasmHash?.length ?? 0} bytes)`);
  console.log(`  ✓ WASM uploaded`);

  // ── Create Contract ──
  console.log(`  Creating contract...`);
  const createOp = Operation.createCustomContract({
    wasmHash,
    address: deployerAddr,
    salt,
  });

  try {
    await simSignSend(server, keypair, createOp, `${label} create`);
  } catch (e: any) {
    // If contract already exists, that's OK - use the expected address
    if (e.message.includes("ExistingValue")) {
      console.log(`  (already deployed, using expected address)`);
      console.log(`  ✓ ${label}: ${expectedAddr}`);
      return expectedAddr;
    }
    throw e;
  }

  console.log(`  ✓ ${label}: ${expectedAddr}`);
  return expectedAddr;
}

async function initContract(
  server: SorobanRpc.Server,
  contractAddr: string,
  funcName: string,
  args: xdr.ScVal[],
  label: string,
  keypair: Keypair,
): Promise<string> {
  console.log(`  Init ${contractAddr.slice(0, 12)}… (${funcName})`);
  const account = await server.getAccount(keypair.publicKey());
  const source = new Account(keypair.publicKey(), account.sequenceNumber());
  const op = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
      new xdr.InvokeContractArgs({
        contractAddress: new Address(contractAddr).toScAddress(),
        functionName: funcName,
        args,
      }),
    ),
    auth: [],
  });

  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(op).setTimeout(30).build();

  const sim = await server.simulateTransaction(tx);
  if (sim.error) throw new Error(`Init sim error ${label}: ${JSON.stringify(sim.error)}`);

  const prep = await server.prepareTransaction(tx);
  prep.sign(keypair);
  const sent = await server.sendTransaction(prep);
  if (sent.status === "ERROR") throw new Error(`Init send error ${label}`);

  await waitForTxSuccess(sent.hash, label);
  console.log(`  ✓ ${funcName} complete`);
  return sent.hash;
}

async function main() {
  if (!process.env.DEPLOYER_SECRET) throw new Error("Set DEPLOYER_SECRET env var");
  const keypair = Keypair.fromSecret(process.env.DEPLOYER_SECRET);
  console.log(`\nDeployer: ${keypair.publicKey()}\n`);

  const server = new rpc.Server(RPC_URL, { allowHttp: false });

  try {
    const acct = await server.getAccount(keypair.publicKey());
    console.log(`Account seq: ${acct.sequenceNumber()}\n`);
  } catch {
    throw new Error(`Account not funded. Use laboratory.stellar.org`);
  }

  console.log("Loading WASM...");
  const nftWasm = loadWasm("nft_core");
  const paymentWasm = loadWasm("payment_token");
  const marketplaceWasm = loadWasm("marketplace");
  console.log(`  nft-core:      ${(nftWasm.length / 1024).toFixed(1)} KB`);
  console.log(`  payment-token: ${(paymentWasm.length / 1024).toFixed(1)} KB`);
  console.log(`  marketplace:   ${(marketplaceWasm.length / 1024).toFixed(1)} KB\n`);

  console.log("── Deploying ──");
  const nftAddr = await deployContract(server, keypair, nftWasm, "nft_core");
  const paymentAddr = await deployContract(server, keypair, paymentWasm, "payment_token");
  const marketplaceAddr = await deployContract(server, keypair, marketplaceWasm, "marketplace");

  console.log("\n─── Contract Addresses ───");
  console.log(`NFT_CORE_ADDRESS=${nftAddr}`);
  console.log(`PAYMENT_TOKEN_ADDRESS=${paymentAddr}`);
  console.log(`MARKETPLACE_ADDRESS=${marketplaceAddr}`);

  console.log("\n── Initializing ──\n");
  const deployerAddr = new Address(keypair.publicKey());

  await initContract(server, nftAddr, "initialize", [
    deployerAddr.toScVal(),
    nativeToScVal("Stellar Bridge Genesis", { type: "string" }),
    nativeToScVal("SBG", { type: "string" }),
  ], "nft_core init", keypair);

  await initContract(server, paymentAddr, "initialize", [
    deployerAddr.toScVal(),
    xdr.ScVal.scvSymbol("PayToken"),
    nativeToScVal(7, { type: "u32" }),
  ], "payment_token init", keypair);

  const lastHash = await initContract(server, marketplaceAddr, "initialize", [
    deployerAddr.toScVal(),
    new Address(paymentAddr).toScVal(),
    nativeToScVal(250, { type: "u32" }),
  ], "marketplace init", keypair);

  // Write .env.local
  const envLocal = [
    "# Stellar Testnet",
    `NEXT_PUBLIC_NETWORK=testnet`,
    `NEXT_PUBLIC_RPC_URL=${RPC_URL}`,
    `NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org`,
    `NEXT_PUBLIC_NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,
    `NEXT_PUBLIC_NFT_CORE_ADDRESS=${nftAddr}`,
    `NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=${paymentAddr}`,
    `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddr}`,
    "",
  ].join("\n");
  fs.writeFileSync(path.resolve(process.cwd(), "apps/web/.env.local"), envLocal);
  console.log(`\n  → apps/web/.env.local written`);

  fs.writeFileSync(path.resolve(process.cwd(), "tx-hash.txt"), lastHash);
  console.log(`  → tx-hash.txt written`);

  console.log("\n✅ Deployment complete!\n");
}

main().catch((e) => {
  console.error("Deploy failed:", (e as Error).message);
  process.exit(1);
});
