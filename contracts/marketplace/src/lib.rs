//! # Marketplace
//!
//! Fixed-price listings AND English auctions for NFTs, with native royalty
//! splits enforced via a cross-contract call into the NFT contract.
//!
//! ## Listing flow
//! 1. Seller calls `nft-core.approve(marketplace, token_id)`.
//! 2. Seller calls `marketplace.list(nft, token_id, price)`.
//! 3. Marketplace pulls the NFT into its own escrow via
//!    `nft.transfer_from(spender=marketplace, from=seller, to=marketplace, token_id)`.
//! 4. Buyer calls `payment-token.approve(marketplace, price)`.
//! 5. Buyer calls `marketplace.buy(nft, token_id)` — Marketplace pulls the
//!    price token, pays seller (minus fees/royalty), then transfers the NFT
//!    to the buyer.
//!
//! ## Auction flow
//! 1. Seller approves marketplace on the NFT, then calls
//!    `marketplace.create_auction(nft, token_id, reserve, duration, min_increment_bps)`.
//! 2. Bidders approve marketplace for their bid amount, then call
//!    `marketplace.bid(nft, token_id, amount)`. Each new bid refunds the
//!    previous one in the same call (push model). Anti-snipe: bids in the
//!    last N ledgers extend the auction by M ledgers.
//! 3. After `end_ledger`, anyone calls `marketplace.settle_auction(nft, token_id)`.
//!    The marketplace queries `nft.royalty_info(token_id)` to compute the
//!    royalty payout, distributes funds (royalty → recipient, fee → admin,
//!    remainder → seller), and transfers the NFT to the winner.

#![no_std]

mod errors;
mod events;
mod storage;
#[cfg(test)]
mod test;

use errors::ContractError;
use events::{
    publish_auction_bid, publish_auction_cancelled, publish_auction_created, publish_auction_extended,
    publish_auction_settled, publish_listing_bought, publish_listing_cancelled, publish_listing_created,
};
use soroban_sdk::{contract, contractimpl, token, Address, Env, IntoVal, Symbol, TryFromVal, Vec};
use storage::{
    bump_instance, bump_persistent_a, bump_persistent_l, Auction, DataKey, Listing,
};

const MAX_BPS: u32 = 10_000;

// ────────────────────────── helpers ──────────────────────────

fn require_admin(env: &Env) -> Result<Address, ContractError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::NotInitialized)?;
    admin.require_auth();
    Ok(admin)
}

fn nft_call<T>(env: &Env, nft: &Address, fn_: &str, args: Vec<soroban_sdk::Val>) -> Result<T, ContractError>
where
    T: TryFromVal<Env, soroban_sdk::Val>,
{
    let sym = Symbol::new(env, fn_);
    let val = env.invoke_contract::<soroban_sdk::Val>(nft, &sym, args);
    T::try_from_val(env, &val).map_err(|_| ContractError::NftTransferFailed)
}

fn subtract_bps(amount: i128, bps: u32) -> Result<i128, ContractError> {
    let bps_i = bps as i128;
    if bps_i > MAX_BPS as i128 {
        return Err(ContractError::RoyaltyBpsInvalid);
    }
    amount
        .checked_mul(bps_i)
        .and_then(|x| x.checked_div(MAX_BPS as i128))
        .ok_or(ContractError::ArithmeticOverflow)
}

#[contract]
pub struct Marketplace;

#[contractimpl]
impl Marketplace {
    // ────────────────────────── Admin ──────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        payment_token: Address,
        fee_bps: u32,
    ) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        if fee_bps > MAX_BPS {
            return Err(ContractError::FeeBpsInvalid);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        // Sensible defaults; can be tuned post-deploy via setters.
        env.storage().instance().set(&DataKey::MinAuctionDurationLedgers, &1_000u32);
        env.storage().instance().set(&DataKey::MaxAuctionDurationLedgers, &518_400u32);
        env.storage().instance().set(&DataKey::AntiSnipeWindowLedgers, &100u32);
        env.storage().instance().set(&DataKey::AntiSnipeExtendLedgers, &200u32);
        env.storage().instance().set(&DataKey::MinBidIncrementBps, &500u32);
        bump_instance(&env);
        Ok(())
    }

    pub fn set_fee(env: Env, new_fee_bps: u32) -> Result<(), ContractError> {
        require_admin(&env)?;
        if new_fee_bps > MAX_BPS {
            return Err(ContractError::FeeBpsInvalid);
        }
        env.storage().instance().set(&DataKey::FeeBps, &new_fee_bps);
        bump_instance(&env);
        Ok(())
    }

    pub fn set_min_bid_increment(env: Env, new_bps: u32) -> Result<(), ContractError> {
        require_admin(&env)?;
        if new_bps > MAX_BPS {
            return Err(ContractError::RoyaltyBpsInvalid);
        }
        env.storage().instance().set(&DataKey::MinBidIncrementBps, &new_bps);
        bump_instance(&env);
        Ok(())
    }

    pub fn admin(env: Env) -> Result<Address, ContractError> {
        env.storage().instance().get(&DataKey::Admin).ok_or(ContractError::NotInitialized)
    }

    pub fn payment_token(env: Env) -> Result<Address, ContractError> {
        env.storage().instance().get(&DataKey::PaymentToken).ok_or(ContractError::NotInitialized)
    }

    pub fn fee_bps(env: Env) -> Result<u32, ContractError> {
        env.storage().instance().get(&DataKey::FeeBps).ok_or(ContractError::NotInitialized)
    }

    // ────────────────────────── Fixed-price listings ──────────────────────────

    /// Create a fixed-price listing. Seller MUST approve marketplace on the
    /// NFT contract for the given token_id before calling this.
    pub fn list(
        env: Env,
        seller: Address,
        nft: Address,
        token_id: u32,
        price: i128,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        if price <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Listing(nft.clone(), token_id))
        {
            return Err(ContractError::SelfListing);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Auction(nft.clone(), token_id))
        {
            return Err(ContractError::SelfListing);
        }

        // Cross-contract call: pull NFT into escrow.
        Self::pull_nft_into_escrow(&env, &seller, &nft, token_id)?;

        let listing = Listing {
            seller: seller.clone(),
            nft: nft.clone(),
            token_id,
            price,
            created_at: env.ledger().sequence(),
        };
        env.storage().persistent().set(
            &DataKey::Listing(nft.clone(), token_id),
            &listing,
        );
        bump_persistent_l(&env, &nft, token_id);

        publish_listing_created(&env, &seller, &nft, token_id, price);
        Ok(())
    }

    /// Buy a listing. Buyer MUST approve marketplace on the payment-token
    /// for at least `listing.price` before calling.
    pub fn buy(env: Env, buyer: Address, nft: Address, token_id: u32) -> Result<(), ContractError> {
        buyer.require_auth();
        let listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(nft.clone(), token_id))
            .ok_or(ContractError::ListingNotFound)?;

        // Pull token payment into escrow, then distribute (royalty, fee, seller remainder),
        // then push NFT to buyer.
        let payment: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .ok_or(ContractError::NotInitialized)?;
        let fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::FeeBps)
            .ok_or(ContractError::NotInitialized)?;
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;

        let token_client = token::Client::new(&env, &payment);
        token_client.transfer_from(
            &env.current_contract_address(),
            &buyer,
            &env.current_contract_address(),
            &listing.price,
        );

        // Compute and payout splits.
        let royalty_args: Vec<soroban_sdk::Val> =
            soroban_sdk::vec![&env, token_id.into_val(&env)];
        let royalty: (Address, u32) = nft_call(&env, &nft, "royalty_info", royalty_args)?;
        let royalty_amount = subtract_bps(listing.price, royalty.1)?;
        let fee_amount = subtract_bps(listing.price, fee_bps)?;
        let seller_net = listing
            .price
            .checked_sub(royalty_amount)
            .and_then(|x| x.checked_sub(fee_amount))
            .ok_or(ContractError::ArithmeticOverflow)?;

        if royalty_amount > 0 {
            token_client.transfer(&env.current_contract_address(), &royalty.0, &royalty_amount);
        }
        if fee_amount > 0 {
            token_client.transfer(&env.current_contract_address(), &admin, &fee_amount);
        }
        token_client.transfer(&env.current_contract_address(), &listing.seller, &seller_net);

        // Update NFT state: marketplace is currently the owner, push to buyer.
        Self::transfer_nft_from_escrow(&env, &nft, token_id, &buyer)?;

        // Clear listing. Do NOT bump TTL on a removed key — extend_ttl
        // on a deleted entry panics in soroban-env-host 22.x.
        env.storage().persistent().remove(&DataKey::Listing(nft.clone(), token_id));
        publish_listing_bought(&env, &buyer, &listing.seller, &nft, token_id, listing.price);
        Ok(())
    }

    /// Cancel a listing. Returns NFT to seller. No payment has been taken yet
    /// because buy() does the full payout before clearing.
    pub fn cancel_listing(
        env: Env,
        seller: Address,
        nft: Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        let listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(nft.clone(), token_id))
            .ok_or(ContractError::ListingNotFound)?;
        if listing.seller != seller {
            return Err(ContractError::NotSeller);
        }
        Self::transfer_nft_from_escrow(&env, &nft, token_id, &seller)?;
        env.storage().persistent().remove(&DataKey::Listing(nft.clone(), token_id));
        publish_listing_cancelled(&env, &seller, &nft, token_id);
        Ok(())
    }

    // ────────────────────────── Auctions ──────────────────────────

    /// Create an auction. Seller MUST approve marketplace on the NFT for
    /// `token_id` before calling.
    pub fn create_auction(
        env: Env,
        seller: Address,
        nft: Address,
        token_id: u32,
        reserve_price: i128,
        duration_ledgers: u32,
        min_bid_increment_bps: u32,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        if env
            .storage()
            .persistent()
            .has(&DataKey::Listing(nft.clone(), token_id))
        {
            return Err(ContractError::SelfListing);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Auction(nft.clone(), token_id))
        {
            return Err(ContractError::AuctionAlreadyHasBids);
        }
        if reserve_price < 0 {
            return Err(ContractError::InvalidAmount);
        }

        let min_dur: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MinAuctionDurationLedgers)
            .unwrap_or(1_000u32);
        let max_dur: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxAuctionDurationLedgers)
            .unwrap_or(518_400u32);
        if duration_ledgers < min_dur {
            return Err(ContractError::DurationTooShort);
        }
        if duration_ledgers > max_dur {
            return Err(ContractError::DurationTooLong);
        }
        if min_bid_increment_bps > MAX_BPS {
            return Err(ContractError::RoyaltyBpsInvalid);
        }

        // Pull NFT into escrow.
        Self::pull_nft_into_escrow(&env, &seller, &nft, token_id)?;

        let start = env.ledger().sequence();
        let end = start.checked_add(duration_ledgers).ok_or(ContractError::ArithmeticOverflow)?;
        let auction = Auction {
            seller: seller.clone(),
            nft: nft.clone(),
            token_id,
            reserve_price,
            start_ledger: start,
            end_ledger: end,
            current_high_bid: 0,
            current_high_bidder: seller.clone(), // sentinel: auction has no real bidder yet
            settled: false,
            min_bid_increment_bps,
        };
        env.storage().persistent().set(
            &DataKey::Auction(nft.clone(), token_id),
            &auction,
        );
        bump_persistent_a(&env, &nft, token_id);

        publish_auction_created(&env, &seller, &nft, token_id, reserve_price, end);
        Ok(())
    }

    /// Place a bid. Bidder MUST approve marketplace on the payment-token for
    /// at least `amount` before calling.
    pub fn bid(
        env: Env,
        bidder: Address,
        nft: Address,
        token_id: u32,
        amount: i128,
    ) -> Result<(), ContractError> {
        bidder.require_auth();
        let mut auction: Auction = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(nft.clone(), token_id))
            .ok_or(ContractError::AuctionNotFound)?;
        if auction.settled {
            return Err(ContractError::AuctionAlreadyEnded);
        }
        if env.ledger().sequence() >= auction.end_ledger {
            return Err(ContractError::AuctionAlreadyEnded);
        }
        // Forbid bids by the seller themselves — the sentinel-based refund logic
        // would otherwise lock the seller's tokens on outbid.
        if bidder == auction.seller {
            return Err(ContractError::SelfBid);
        }
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if amount < auction.reserve_price {
            return Err(ContractError::BidTooLow);
        }
        // Use auction-specific min bid increment if set, otherwise fall back to global config.
        let increment_bps: u32 = if auction.min_bid_increment_bps > 0 {
            auction.min_bid_increment_bps
        } else {
            env.storage()
                .instance()
                .get(&DataKey::MinBidIncrementBps)
                .unwrap_or(500u32)
        };
        let min_next = if auction.current_high_bid > 0 {
            auction
                .current_high_bid
                .checked_add(subtract_bps(auction.current_high_bid, increment_bps).unwrap_or(0))
                .unwrap_or(amount)
        } else {
            amount
        };
        if auction.current_high_bid > 0 && amount < min_next {
            return Err(ContractError::BidTooLow);
        }

        // Pull new bid token into escrow.
        let payment: Address = env
            .storage().instance().get(&DataKey::PaymentToken).ok_or(ContractError::NotInitialized)?;
        let token_client = token::Client::new(&env, &payment);
        token_client.transfer_from(
            &env.current_contract_address(),
            &bidder,
            &env.current_contract_address(),
            &amount,
        );

        // Push-style refund of the previous bidder. Safe because we already
        // rejected seller-as-bidder above; prev_bidder is whatever was set last.
        let prev = auction.current_high_bidder.clone();
        let prev_amount = auction.current_high_bid;
        if prev_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &prev,
                &prev_amount,
            );
        }

        // Anti-snipe: if bidding within the last N ledgers, extend by M ledgers.
        let now = env.ledger().sequence();
        let window: u32 = env
            .storage().instance().get(&DataKey::AntiSnipeWindowLedgers).unwrap_or(100u32);
        let extend: u32 = env
            .storage().instance().get(&DataKey::AntiSnipeExtendLedgers).unwrap_or(200u32);
        let old_end = auction.end_ledger;
        let new_end = if now.checked_add(window).unwrap_or(u32::MAX) >= old_end {
            old_end.checked_add(extend).unwrap_or(u32::MAX)
        } else {
            old_end
        };

        // Update auction record.
        auction.current_high_bid = amount;
        auction.current_high_bidder = bidder.clone();
        auction.end_ledger = new_end;
        env.storage().persistent().set(
            &DataKey::Auction(nft.clone(), token_id),
            &auction,
        );
        bump_persistent_a(&env, &nft, token_id);

        publish_auction_bid(&env, &bidder, &prev, &nft, token_id, amount);
        if new_end > old_end {
            publish_auction_extended(&env, &nft, token_id, new_end);
        }
        Ok(())
    }

    /// Settle an auction after `end_ledger` has passed. Distributes funds
    /// and transfers the NFT to the winner.
    pub fn settle_auction(
        env: Env,
        nft: Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        let mut auction: Auction = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(nft.clone(), token_id))
            .ok_or(ContractError::AuctionNotFound)?;
        if auction.settled {
            return Err(ContractError::AuctionAlreadyEnded);
        }
        if env.ledger().sequence() < auction.end_ledger {
            return Err(ContractError::AuctionNotEnded);
        }

        let payment: Address = env
            .storage().instance().get(&DataKey::PaymentToken).ok_or(ContractError::NotInitialized)?;
        let fee_bps: u32 = env
            .storage().instance().get(&DataKey::FeeBps).ok_or(ContractError::NotInitialized)?;
        let admin: Address = env
            .storage().instance().get(&DataKey::Admin).ok_or(ContractError::NotInitialized)?;
        let token_client = token::Client::new(&env, &payment);

        // Reserve-not-met path: no bids, just return NFT to seller.
        if auction.current_high_bid == 0 {
            Self::transfer_nft_from_escrow(&env, &nft, token_id, &auction.seller)?;
            auction.settled = true;
            env.storage().persistent().set(&DataKey::Auction(nft.clone(), token_id), &auction);
            bump_persistent_a(&env, &nft, token_id);
            publish_auction_cancelled(&env, &auction.seller, &nft, token_id);
            return Ok(());
        }

        // Successful settlement: split the final bid.
        let price = auction.current_high_bid;
        let royalty_args: Vec<soroban_sdk::Val> =
            soroban_sdk::vec![&env, token_id.into_val(&env)];
        let royalty: (Address, u32) = nft_call(&env, &nft, "royalty_info", royalty_args)?;
        let royalty_amount = subtract_bps(price, royalty.1)?;
        let fee_amount = subtract_bps(price, fee_bps)?;
        let seller_net = price
            .checked_sub(royalty_amount)
            .and_then(|x| x.checked_sub(fee_amount))
            .ok_or(ContractError::ArithmeticOverflow)?;

        if royalty_amount > 0 {
            token_client.transfer(&env.current_contract_address(), &royalty.0, &royalty_amount);
        }
        if fee_amount > 0 {
            token_client.transfer(&env.current_contract_address(), &admin, &fee_amount);
        }
        token_client.transfer(&env.current_contract_address(), &auction.seller, &seller_net);

        Self::transfer_nft_from_escrow(&env, &nft, token_id, &auction.current_high_bidder)?;

        auction.settled = true;
        env.storage().persistent().set(&DataKey::Auction(nft.clone(), token_id), &auction);
        bump_persistent_a(&env, &nft, token_id);

        publish_auction_settled(
            &env,
            &auction.current_high_bidder,
            &auction.seller,
            &nft,
            token_id,
            price,
        );
        Ok(())
    }

    /// Cancel an auction. Only allowed if no bids have been placed
    /// AND the auction has not already settled.
    pub fn cancel_auction(
        env: Env,
        seller: Address,
        nft: Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        seller.require_auth();
        let mut auction: Auction = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(nft.clone(), token_id))
            .ok_or(ContractError::AuctionNotFound)?;
        if auction.settled {
            return Err(ContractError::AuctionAlreadyEnded);
        }
        if auction.seller != seller {
            return Err(ContractError::NotSeller);
        }
        if auction.current_high_bid != 0 {
            return Err(ContractError::AuctionAlreadyHasBids);
        }
        auction.settled = true;
        env.storage().persistent().set(&DataKey::Auction(nft.clone(), token_id), &auction);
        Self::transfer_nft_from_escrow(&env, &nft, token_id, &seller)?;
        bump_persistent_a(&env, &nft, token_id);
        publish_auction_cancelled(&env, &seller, &nft, token_id);
        Ok(())
    }

    // ────────────────────────── Views ──────────────────────────

    pub fn get_listing(env: Env, nft: Address, token_id: u32) -> Result<Listing, ContractError> {
        let l = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(nft.clone(), token_id))
            .ok_or(ContractError::ListingNotFound)?;
        bump_persistent_l(&env, &nft, token_id);
        Ok(l)
    }

    pub fn get_auction(env: Env, nft: Address, token_id: u32) -> Result<Auction, ContractError> {
        let a = env
            .storage()
            .persistent()
            .get(&DataKey::Auction(nft.clone(), token_id))
            .ok_or(ContractError::AuctionNotFound)?;
        bump_persistent_a(&env, &nft, token_id);
        Ok(a)
    }

    pub fn min_bid_increment_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::MinBidIncrementBps).unwrap_or(500u32)
    }

    pub fn anti_snipe_window(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::AntiSnipeWindowLedgers).unwrap_or(100u32)
    }

    pub fn anti_snipe_extend(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::AntiSnipeExtendLedgers).unwrap_or(200u32)
    }

    // ────────────────────────── internals: cross-contract NFT ops ──────────────────────────

    /// Pull an NFT from `seller` into marketplace escrow. Seller MUST have
    /// called `nft.approve(marketplace, token_id)` before this. The marketplace
    /// uses itself as the `spender` (operator) in the nft call.
    fn pull_nft_into_escrow(
        env: &Env,
        seller: &Address,
        nft: &Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        let args: Vec<soroban_sdk::Val> = soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            seller.clone().into_val(env),
            env.current_contract_address().into_val(env),
            token_id.into_val(env),
        ];
        let _: () = nft_call(env, nft, "transfer_from", args)?;
        Ok(())
    }

    /// Push an NFT out of marketplace escrow to `to`. Marketplace is the
    /// current owner of the NFT, so the simplest call to use is `transfer`.
    fn transfer_nft_from_escrow(
        env: &Env,
        nft: &Address,
        token_id: u32,
        to: &Address,
    ) -> Result<(), ContractError> {
        let args: Vec<soroban_sdk::Val> = soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            to.clone().into_val(env),
            token_id.into_val(env),
        ];
        let _: () = nft_call(env, nft, "transfer", args)?;
        Ok(())
    }
}
