#![cfg(test)]

//! NFT contract test suite.
//!
//! Covers initialization, mint, transfer, approval/transfer_from, royalty
//! and metadata updates, plus the major error paths. All tests run via the
//! Soroban SDK's in-process testutils backend — no network required.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, NftCoreClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NftCore, ());
    let client = NftCoreClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let name = String::from_str(&env, "Stellar Bridge Genesis");
    let symbol = String::from_str(&env, "SBG");
    client.initialize(&admin, &name, &symbol);
    (env, client, admin)
}

#[test]
fn initialize_sets_name_symbol_and_admin() {
    let (env, client, admin) = setup();
    assert_eq!(client.admin(), admin);
    assert_eq!(client.name(), String::from_str(&env, "Stellar Bridge Genesis"));
    assert_eq!(client.symbol(), String::from_str(&env, "SBG"));
}

#[test]
fn double_initialize_fails() {
    let (_env, client, admin) = setup();
    let name = String::from_str(&_env, "Again");
    let symbol = String::from_str(&_env, "AGN");
    let r = client.try_initialize(&admin, &name, &symbol);
    assert!(r.is_err());
}

#[test]
fn mint_increments_supply_and_assigns_owner() {
    let (_env, client, _admin) = setup();
    let recipient = Address::generate(&_env);
    let uri = String::from_str(&_env, "ipfs://Qm-test-1");
    let receiver = Address::generate(&_env);
    let id = client.mint(&recipient, &uri, &receiver, &250u32);
    assert_eq!(id, 1);
    assert_eq!(client.total_supply(), 1);
    assert_eq!(client.owner_of(&id), recipient);
    assert_eq!(client.balance_of(&recipient), 1);
}

#[test]
fn mint_rejects_royalty_above_100_percent() {
    let (_env, client, _admin) = setup();
    let recipient = Address::generate(&_env);
    let receiver = Address::generate(&_env);
    let uri = String::from_str(&_env, "ipfs://x");
    let r = client.try_mint(&recipient, &uri, &receiver, &10_001u32);
    assert!(r.is_err());
}

#[test]
fn transfer_moves_owner_and_clears_approval() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let recipient = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");
    let receiver = Address::generate(&env);
    let id = client.mint(&owner, &uri, &receiver, &0u32);

    let operator = Address::generate(&env);
    client.approve(&owner, &operator, &id);
    assert_eq!(client.approved(&id), operator);

    client.transfer(&owner, &recipient, &id);
    assert_eq!(client.owner_of(&id), recipient);
    assert_eq!(client.balance_of(&owner), 0);
    assert_eq!(client.balance_of(&recipient), 1);

    // old operator approval should be cleared after transfer
    let r = client.try_approved(&id);
    assert!(r.is_err());
}

#[test]
fn transfer_from_works_via_approved_operator() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let buyer = Address::generate(&env);
    let op = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");
    let receiver = Address::generate(&env);
    let id = client.mint(&owner, &uri, &receiver, &0u32);

    client.approve(&owner, &op, &id);
    client.transfer_from(&op, &owner, &buyer, &id);
    assert_eq!(client.owner_of(&id), buyer);

    let r = client.try_transfer_from(&op, &owner, &Address::generate(&env), &id);
    assert!(r.is_err()); // approval cleared, so transfer_from fails
}

#[test]
fn transfer_from_without_approval_fails() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let buyer = Address::generate(&env);
    let not_op = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");
    let receiver = Address::generate(&env);
    let id = client.mint(&owner, &uri, &receiver, &0u32);
    let r = client.try_transfer_from(&not_op, &owner, &buyer, &id);
    assert!(r.is_err());
}

#[test]
fn royalty_info_returns_set_values() {
    let (env, client, _admin) = setup();
    let recipient = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");
    let receiver = Address::generate(&env);
    let id = client.mint(&recipient, &uri, &receiver, &750u32);
    let (r_rec, r_bps) = client.royalty_info(&id);
    assert_eq!(r_rec, receiver);
    assert_eq!(r_bps, 750);
}

#[test]
fn royalty_info_for_missing_token_fails() {
    let (_env, client, _admin) = setup();
    let r = client.try_royalty_info(&999u32);
    assert!(r.is_err());
}

#[test]
fn owner_can_update_token_uri_and_royalty() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://v1");
    let receiver = Address::generate(&env);
    let id = client.mint(&owner, &uri, &receiver, &250u32);

    let new_uri = String::from_str(&env, "ipfs://v2");
    client.set_token_uri(&owner, &id, &new_uri);
    assert_eq!(client.token_uri(&id), new_uri);

    let new_receiver = Address::generate(&env);
    client.set_royalty(&owner, &id, &new_receiver, &500u32);
    let (r, bps) = client.royalty_info(&id);
    assert_eq!(r, new_receiver);
    assert_eq!(bps, 500);
}

#[test]
fn non_owner_cannot_set_royalty() {
    let (env, client, _admin) = setup();
    let owner = Address::generate(&env);
    let attacker = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");
    let receiver = Address::generate(&env);
    let id = client.mint(&owner, &uri, &receiver, &250u32);
    let r = client.try_set_royalty(&attacker, &id, &attacker, &500u32);
    assert!(r.is_err());
}
