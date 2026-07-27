// The root path / redirects to /marketplace via next.config.mjs redirects().
// This component only renders if the redirect config is removed later.
import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
      </svg>
    ),
    title: "List & Trade",
    description:
      "Fixed-price listings or English auctions. Royalties flow to creators automatically via on-chain splits — no middlemen.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.77.714 6.023 6.023 0 0 1-2.77-.714" />
      </svg>
    ),
    title: "Royalty Splits",
    description:
      "Creators earn on every resale. Marketplace enforces royalties via cross-contract calls to the NFT core — fully on-chain.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Real-Time Events",
    description:
      "Server-Sent Events stream every mint, listing, bid, and settlement to your browser. Watch the marketplace move live.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Anti-Snipe Auctions",
    description:
      "Bids placed in the final moments extend the clock. No last-second sniping — the highest bidder always wins fair.",
  },
];

const stats = [
  { value: "3", label: "Soroban contracts" },
  { value: "10+", label: "Frontend tests" },
  { value: "23", label: "Contract tests" },
  { value: "100%", label: "Open source" },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* ── Hero ── */}
      <section className="relative pt-16 sm:pt-24 pb-8 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 -top-32 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-48 w-48 rounded-full bg-accent-muted/20 blur-[80px]" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted/20 border border-accent/20 text-accent-soft text-xs font-medium mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          Live on Stellar Soroban Testnet
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1] animate-fade-in">
          The NFT Marketplace
          <br />
          <span className="bg-gradient-to-r from-accent via-accent-soft to-accent bg-clip-text text-transparent">
            Built on Soroban
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto animate-fade-in">
          Mint, list, and bid on NFTs with real royalty splits, English
          auctions with anti-snipe protection, and live blockchain event
          streaming — all powered by Stellar smart contracts.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-all hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
          >
            Explore Marketplace
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/mint"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
          >
            Mint an NFT
          </Link>
          <a
            href="https://github.com/Techie-hu/stellar-bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View Source
          </a>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-bg-surface border border-white/5 p-5 text-center hover:border-accent/20 transition-colors"
          >
            <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-accent-soft to-accent bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Why Stellar Bridge
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
            Every feature runs on-chain through Soroban smart contracts. No
            off-chain order books, no trusted intermediaries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl bg-bg-surface border border-white/5 p-6 hover:border-accent/30 hover:-translate-y-0.5 transition-all"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-accent-muted/20 text-accent-soft mb-4 group-hover:bg-accent/20 group-hover:text-accent transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-100 mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
            From wallet to settled auction in four steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: "01",
              title: "Connect Wallet",
              desc: "Link your Freighter wallet to sign transactions on Stellar Soroban testnet.",
            },
            {
              step: "02",
              title: "Mint or Browse",
              desc: "Create NFTs with custom royalties or browse the live marketplace feed.",
            },
            {
              step: "03",
              title: "List or Bid",
              desc: "Set a fixed price or start an English auction. Bids stream in real time via SSE.",
            },
            {
              step: "04",
              title: "Settle On-Chain",
              desc: "Winning bidder gets the NFT. Seller receives funds minus royalties — all enforced by the contract.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="relative rounded-xl bg-bg-surface border border-white/5 p-5 hover:border-accent/20 transition-colors"
            >
              <div className="text-xs font-mono text-accent-muted mb-3">
                {s.step}
              </div>
              <h3 className="font-semibold text-gray-100 mb-1.5">{s.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-accent-muted/40 via-bg-elevated to-bg-surface border border-white/5 p-8 sm:p-12 text-center">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-accent-muted/15 blur-[80px]" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to start?
          </h2>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
            Connect your Freighter wallet, mint an NFT, and list it on the
            marketplace in under a minute.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-all hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
            >
              Launch Marketplace
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/auctions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.98]"
            >
              View Auctions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
