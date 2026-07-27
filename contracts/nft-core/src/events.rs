//! Event publishers for the NFT contract.
//!
//! Each publish follows the (topic1..topic4) + data format. All event names
//! are `symbol_short!` (max 9 chars) so they can be efficiently indexed.

use soroban_sdk::{symbol_short, Address, Env};

/// Emitted whenever a token is minted.
///
/// Topics: `(MNT, to)` — the recipient address is indexed for filtering.
pub fn publish_mint(env: &Env, to: &Address, token_id: u32) {
    env.events()
        .publish((symbol_short!("MNT"), to.clone()), token_id);
}

/// Emitted whenever a token is transferred (including via `transfer_from`).
///
/// Topics: `(XFER, from, to)`.
pub fn publish_transfer(env: &Env, from: &Address, to: &Address, token_id: u32) {
    env.events().publish(
        (symbol_short!("XFER"), from.clone(), to.clone()),
        token_id,
    );
}

/// Emitted when a token's approved operator changes (new approval or revoke).
///
/// Topics: `(APR, owner, operator)`.
pub fn publish_approval(env: &Env, owner: &Address, operator: &Address, token_id: u32) {
    env.events().publish(
        (symbol_short!("APR"), owner.clone(), operator.clone()),
        token_id,
    );
}

/// Emitted when a token's URI is updated (e.g. metadata refresh).
///
/// Topics: `(URI, token_id)`.
pub fn publish_uri_update(env: &Env, token_id: u32) {
    env.events()
        .publish((symbol_short!("URI"),), (token_id,));
}

/// Emitted when a token's royalty configuration is updated.
///
/// Topics: `(ROY, token_id)`.
pub fn publish_royalty_update(env: &Env, token_id: u32) {
    env.events()
        .publish((symbol_short!("ROY"),), (token_id,));
}
