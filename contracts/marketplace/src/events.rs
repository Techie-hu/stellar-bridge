//! Event publishers for the marketplace contract.
//!
//! Topic conventions:
//! - Always `symbol_short!(<name>)` as topic[0].
//! - Subsequent topics are indexed fields for efficient filtering.
//! - Data payload carries the change in detail.

use soroban_sdk::{symbol_short, Address, Env};

pub fn publish_listing_created(env: &Env, seller: &Address, nft: &Address, token_id: u32, price: i128) {
    env.events().publish(
        (symbol_short!("LST_CR"), seller.clone(), nft.clone()),
        (token_id, price),
    );
}

pub fn publish_listing_bought(env: &Env, buyer: &Address, seller: &Address, nft: &Address, token_id: u32, price: i128) {
    env.events().publish(
        (symbol_short!("LST_BY"), buyer.clone(), seller.clone()),
        (nft.clone(), token_id, price),
    );
}

pub fn publish_listing_cancelled(env: &Env, seller: &Address, nft: &Address, token_id: u32) {
    env.events().publish(
        (symbol_short!("LST_CN"), seller.clone(), nft.clone()),
        token_id,
    );
}

pub fn publish_auction_created(
    env: &Env,
    seller: &Address,
    nft: &Address,
    token_id: u32,
    reserve: i128,
    end_ledger: u32,
) {
    env.events().publish(
        (symbol_short!("AUC_CR"), seller.clone(), nft.clone()),
        (token_id, reserve, end_ledger),
    );
}

pub fn publish_auction_bid(
    env: &Env,
    bidder: &Address,
    prev_bidder: &Address,
    nft: &Address,
    token_id: u32,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("AUC_BID"), bidder.clone(), nft.clone()),
        (prev_bidder.clone(), token_id, amount),
    );
}

pub fn publish_auction_extended(env: &Env, nft: &Address, token_id: u32, new_end_ledger: u32) {
    env.events().publish(
        (symbol_short!("AUC_EX"), nft.clone()),
        (token_id, new_end_ledger),
    );
}

pub fn publish_auction_settled(
    env: &Env,
    winner: &Address,
    seller: &Address,
    nft: &Address,
    token_id: u32,
    final_price: i128,
) {
    env.events().publish(
        (symbol_short!("AUC_SET"), winner.clone(), nft.clone()),
        (seller.clone(), token_id, final_price),
    );
}

pub fn publish_auction_cancelled(env: &Env, seller: &Address, nft: &Address, token_id: u32) {
    env.events().publish(
        (symbol_short!("AUC_CN"), seller.clone(), nft.clone()),
        token_id,
    );
}
