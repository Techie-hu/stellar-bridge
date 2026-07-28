import type { Metadata } from "next";
import { Providers } from "./providers";
import { WalletConnect } from "@/components/WalletConnect";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Bridge — NFT Marketplace",
  description:
    "Production-grade NFT marketplace with English auctions, royalty splits, and live event streaming on Stellar/Soroban.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Stellar Bridge — NFT Marketplace",
    description:
      "Mint, list, and bid on Stellar NFTs. Real royalty splits. English auctions with anti-snipe.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-30 backdrop-blur-md bg-bg-base/70 border-b border-white/5">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <a
                  href="/"
                  className="flex items-center gap-2 font-semibold tracking-tight text-lg"
                >
                  <span className="inline-block h-7 w-7 rounded-md bg-gradient-to-br from-accent to-accent-muted" />
                  <span>Stellar Bridge</span>
                </a>
                <nav className="hidden md:flex items-center gap-1 text-sm">
                  {[
                    ["/marketplace", "Marketplace"],
                    ["/auctions", "Auctions"],
                    ["/mint", "Mint"],
                    ["/profile", "Profile"],
                  ].map(([href, label]) => (
                    <a
                      key={href}
                      href={href}
                      className="px-3 py-1.5 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
                <WalletConnect />
              </div>
            </header>
            <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-8 animate-fade-in">
              {children}
            </main>
            <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-gray-500">
              Stellar Bridge — built on Soroban. Open source under MIT.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
