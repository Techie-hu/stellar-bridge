//! Storage layout for the marketplace contract.

use soroban_sdk::{contracttype, Address};

pub const PERSISTENT_TTL_THRESHOLD: u32 = 518_400; // ~30 days
pub const PERSISTENT_TTL_BUMP_AMOUNT: u32 = 518_400;
pub const INSTANCE_TTL_BUMP_AMOUNT: u32 = 17_280;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    // ─── instance config ───
    Admin,
    FeeBps,
    PaymentToken,
    MinAuctionDurationLedgers,
    MaxAuctionDurationLedgers,
    AntiSnipeWindowLedgers,
    AntiSnipeExtendLedgers,
    MinBidIncrementBps,

    // ─── persistent records ───
    Listing(Address, u32),    // nft_addr, token_id
    Auction(Address, u32),    // nft_addr, token_id
}

#[contracttype]
#[derive(Clone)]
pub struct Listing {
    pub seller: Address,
    pub nft: Address,
    pub token_id: u32,
    pub price: i128,
    pub created_at: u32, // ledger sequence
}

#[contracttype]
#[derive(Clone)]
pub struct Auction {
    pub seller: Address,
    pub nft: Address,
    pub token_id: u32,
    pub reserve_price: i128,
    pub start_ledger: u32,
    pub end_ledger: u32,
    pub current_high_bid: i128,
    pub current_high_bidder: Address,
    pub settled: bool,
    pub min_bid_increment_bps: u32,
}

impl Listing {
    pub fn bump_persistent(env: &soroban_sdk::Env, key: &DataKey) {
        let _ = env
            .storage()
            .persistent()
            .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP_AMOUNT);
    }
}

pub fn bump_persistent_l(env: &soroban_sdk::Env, nft: &Address, token_id: u32) {
    let _ = env.storage().persistent().extend_ttl(
        &DataKey::Listing(nft.clone(), token_id),
        PERSISTENT_TTL_THRESHOLD,
        PERSISTENT_TTL_BUMP_AMOUNT,
    );
}

pub fn bump_persistent_a(env: &soroban_sdk::Env, nft: &Address, token_id: u32) {
    let _ = env.storage().persistent().extend_ttl(
        &DataKey::Auction(nft.clone(), token_id),
        PERSISTENT_TTL_THRESHOLD,
        PERSISTENT_TTL_BUMP_AMOUNT,
    );
}

pub fn bump_instance(env: &soroban_sdk::Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_BUMP_AMOUNT, INSTANCE_TTL_BUMP_AMOUNT);
}
