/**
 * /api/events/stream — Server-Sent Events for live marketplace + NFT events.
 *
 * Architecture (for production):
 *   - Single Node.js poller in the module scope ticks every 2s.
 *   - Holds lastLedger cursor and broadcasts new events to all subscribed
 *     clients via a Set of stream controllers.
 *   - On Vercel, this is bounded by function execution limits — clients
 *     auto-reconnect on stream close. Production should move the cursor
 *     into Redis/KV.
 */

import { NextRequest } from "next/server";
import { SorobanRpc } from "@stellar/stellar-sdk";
import { contractIds, sorobanRpcUrl } from "@/lib/stellar";

type Topic = string;

type StreamEvent = {
  ts: number;
  contract: string;
  topics: Topic[];
  data?: unknown;
};

const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
let lastLedger: number | null = null;
let pollInFlight = false;

const encoder = new TextEncoder();

async function tick() {
  if (pollInFlight || clients.size === 0) return;
  pollInFlight = true;
  try {
    const server = new SorobanRpc.Server(sorobanRpcUrl, { allowHttp: false });
    const response = await server.getEvents({
      startLedger: lastLedger ?? undefined,
      filters: [
        {
          type: "contract",
          contractIds: [contractIds.marketplace, contractIds.nftCore].filter(
            (id) => id.startsWith("C") && !id.includes("0".repeat(55)),
          ),
        },
      ],
      limit: 50,
    });

    if (response.events.length > 0) {
      lastLedger = Number(response.latestLedger.toString());
      const payload: StreamEvent[] = response.events.map((evt) => ({
        ts: Date.now(),
        contract:
          typeof evt.contractId === "string"
            ? evt.contractId
            : String(evt.contractId ?? ""),
        topics: (evt.topic ?? []).map((t) => String(t)),
        data: evt.value,
      }));

      const chunk = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
      for (const c of clients) {
        try {
          c.enqueue(chunk);
        } catch {
          clients.delete(c);
        }
      }
    }
  } catch (err) {
    console.error("[events/stream] poll error", err);
  } finally {
    pollInFlight = false;
  }
}

const POLL_INTERVAL_MS = 2000;
setInterval(tick, POLL_INTERVAL_MS);

export async function GET(req: NextRequest) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clients.add(controller);
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ ts: Date.now(), hello: "ok" })}\n\n`,
        ),
      );
      req.signal.addEventListener("abort", () => clients.delete(controller));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
