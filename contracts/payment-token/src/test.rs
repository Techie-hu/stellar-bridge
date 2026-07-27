#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

fn setup() -> (Env, PaymentTokenClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(PaymentToken, ());
    let client = PaymentTokenClient::new(&env, &id);
    let admin = Address::generate(&env);
    let name = Symbol::new(&env, "PayToken");
    client.initialize(&admin, &name, &7u32);
    (env, client, admin)
}

#[test]
fn mint_increments_balance_and_supply() {
    let (_env, client, _admin) = setup();
    let alice = Address::generate(&_env);
    client.mint(&alice, &1_000_000i128);
    assert_eq!(client.balance(&alice), 1_000_000);
    assert_eq!(client.total_supply(), 1_000_000);
}

#[test]
fn transfer_updates_balances_for_both_sides() {
    let (env, client, _) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint(&alice, &500);
    client.transfer(&alice, &bob, &200);
    assert_eq!(client.balance(&alice), 300);
    assert_eq!(client.balance(&bob), 200);
}

#[test]
fn approve_and_transfer_from_works() {
    let (env, client, _) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let spender = Address::generate(&env);
    client.mint(&alice, &1_000);
    client.approve(&alice, &spender, &500, &u32::MAX);
    assert_eq!(client.allowance(&alice, &spender), 500);
    client.transfer_from(&spender, &alice, &bob, &500);
    assert_eq!(client.balance(&alice), 500);
    assert_eq!(client.balance(&bob), 500);
    assert_eq!(client.allowance(&alice, &spender), 0);
}
