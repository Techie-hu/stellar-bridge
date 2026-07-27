//! Storage layout and TTL helpers for the NFT contract.
//!
//! Instance storage holds the admin and contract-wide configuration.
//! Persistent storage holds per-token state and per-owner balances.
//! Every persistent key is bumped on every write so token state stays valid
//! for at least ~30 days after its last touch.

use soroban_sdk::{contracttype, Address, Env};

/// Number of ledgers to extend persistent storage TTL on every write.
/// 518,400 ledgers ≈ 30 days at ~5s/ledger on testnet.
pub const PERSISTENT_TTL_THRESHOLD: u32 = 518_400;

/// Persistent storage bump when a token is touched.
pub const PERSISTENT_TTL_BUMP_AMOUNT: u32 = 518_400;

/// Instance storage bump amount — short-lived config.
pub const INSTANCE_TTL_BUMP_AMOUNT: u32 = 17_280; // ~1 day

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Contract admin (set in `initialize`, used for mint/admin calls).
    Admin,
    /// Collection name.
    Name,
    /// Collection symbol.
    Symbol,
    /// Next token ID to mint; auto-incremented on mint.
    NextTokenId,
    /// Persistent: owner of a given token id.
    TokenOwner(u32),
    /// Persistent: approved operator for a given token id.
    TokenApproval(u32),
    /// Persistent: count of tokens owned by an address.
    OwnerBalance(Address),
    /// Persistent: metadata URI for a token (must be provided on mint).
    TokenURI(u32),
    /// Persistent: royalty bps (0..=10000) for a token.
    RoyaltyBps(u32),
    /// Persistent: royalty recipient address for a token.
    RoyaltyRecipient(u32),
}

pub fn bump_persistent(env: &Env, key: &DataKey) {
    let _ = env
        .storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP_AMOUNT);
}

pub fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_BUMP_AMOUNT, INSTANCE_TTL_BUMP_AMOUNT);
}
