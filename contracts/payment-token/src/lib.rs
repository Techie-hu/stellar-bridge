//! # Payment Token
//!
//! Minimal SEP-41-compatible fungible token. Used by the marketplace as the
//! currency for listings and auctions. In a true production setup you would
//! use the Stellar Asset Contract (SAC); this contract keeps the demo
//! self-contained so you don't have to fund an issuer account on testnet.

#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

const INSTANCE_TTL_THRESHOLD: u32 = 518_400; // ~30 days
const INSTANCE_TTL_BUMP_AMOUNT: u32 = 518_400;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
    Balance(Address),
    Allowance(Address, Address), // (from, spender)
    TotalSupply,
}

#[contract]
pub struct PaymentToken;

#[contractimpl]
impl PaymentToken {
    pub fn initialize(env: Env, admin: Address, name: Symbol, decimals: u32) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        Self::bump_instance(&env);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        Self::bump_balance(&env, &to, amount);
        let total: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0i128);
        env.storage().instance().set(&DataKey::TotalSupply, &(total + amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        Self::move_balance(&env, &from, &to, amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allowed: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(0i128);
        if allowed < amount {
            panic!("insufficient allowance");
        }
        env.storage()
            .instance()
            .set(&DataKey::Allowance(from.clone(), spender.clone()), &(allowed - amount));
        Self::move_balance(&env, &from, &to, amount);
    }

    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        owner.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::Allowance(owner, spender), &amount);
        Self::bump_instance(&env);
    }

    pub fn balance(env: Env, owner: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0i128)
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Allowance(owner, spender))
            .unwrap_or(0i128)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0i128)
    }

    // ────────────────────────── internals ──────────────────────────

    fn bump_instance(env: &Env) {
        let _ = env
            .storage()
            .instance()
            .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_BUMP_AMOUNT);
    }

    fn bump_balance(env: &Env, addr: &Address, by: i128) {
        let cur: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(addr.clone()))
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::Balance(addr.clone()), &(cur + by));
        Self::bump_instance(env);
    }

    fn move_balance(env: &Env, from: &Address, to: &Address, amount: i128) {
        let from_bal: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0i128);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        env.storage()
            .instance()
            .set(&DataKey::Balance(from.clone()), &(from_bal - amount));
        // bump_balance handles the TTL bump for both from_bal (above) and to_bal (inside)
        Self::bump_balance(env, to, amount);
    }
}
