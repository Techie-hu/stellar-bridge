# Demo Script (1–2 minutes)

## 1. Marketplace Overview (15s)
Open `/marketplace`. Show the responsive grid:
- 1 column on mobile, 2 on tablet, 4 on desktop
- Filter tabs: All / Listed / Auctions
- Click into an NFT to see detail page

## 2. Connect Wallet (10s)
Click "Connect Wallet" in the top-right.
- Shows network badge (TESTNET)
- Address is shortened (G…XXXX)
- Disconnect button available

## 3. Mint an NFT (15s)
Navigate to `/mint`.
- Fill in metadata URI
- Set royalty to 5% (500 bps)
- Click "Mint NFT"
- Toast confirms mock-mint queued

## 4. List for Sale (15s)
From the NFTCard action, list an NFT for 100 PAY.
- Listing emits `LST_CR` event
- New listing appears in marketplace feed

## 5. Real-time SSE Stream (15s)
Open `/api/events/stream` in a second tab.
- Shows `hello: ok` heartbeat
- New events pushed as JSON when contracts emit

## 6. Place a Bid (15s)
Navigate to Auctions page.
- Place a bid on an active auction
- Previous bidder is refunded (push-refund)
- Anti-snipe timer extension triggers if bidding near end

## 7. Settle Auction (10s)
After auction ends, settle:
- NFT transfers to highest bidder
- Seller receives (price - royalty - fee)
- Royalty recipient gets their split

## 8. CI/CD Pipeline (10s)
Show GitHub Actions:
- Contracts job: cargo check → cargo test → cargo build ✅
- Frontend job: install → typecheck → lint → test → build ✅
- All-green status check

## Total: ~1:45
