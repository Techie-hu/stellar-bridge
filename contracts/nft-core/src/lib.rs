//! # NFT Core
//!
//! A minimal Soroban NFT implementation supporting:
//!
//! - **Mint** with explicit auto-incrementing token IDs
//! - **Direct transfer** by the owner
//! - **Operator approval** + `transfer_from`
//! - **Per-token metadata URI**
//! - **Per-token, per-recipient royalty** (basis points, 0..=10_000)
//! - **Events** for mint, transfer, approval, URI update, royalty update
//!
//! All token IDs are reserved (state stored) on mint, so the contract size
//! and gas costs are stable.
//!
//! The contract is intentionally kept under 256 instructions per public
//! entry point so it stays cheap to invoke on testnet.

#![no_std]

mod errors;
mod events;
mod storage;
#[cfg(test)]
mod test;

use errors::ContractError;
use events::{
    publish_approval, publish_mint, publish_royalty_update, publish_transfer, publish_uri_update,
};
use soroban_sdk::{contract, contractimpl, Address, Env, String};
use storage::{bump_instance, bump_persistent, DataKey};

const MAX_BPS: u32 = 10_000; // 100% in basis points

#[contract]
pub struct NftCore;

#[contractimpl]
impl NftCore {
    /// Initialize the contract. Can only be called once.
    ///
    /// * `admin` — address authorized to mint and update royalty defaults
    /// * `name`  — collection name (e.g. `"Stellar Bridge Genesis"`)
    /// * `symbol` — ticker (e.g. `"SBG"`)
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String) -> Result<(), ContractError> {
        // Write NextTokenId FIRST to create the instance storage scope.
        // Freshly created contracts may not have an instance scope yet;
        // has() and extend_ttl() fail on non-existent scopes, but set() creates it.
        env.storage().instance().set(&DataKey::NextTokenId, &0u32);

        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::NextTokenId, &0u32);
        bump_instance(&env);
        Ok(())
    }

    // ────────────────────────── Admin views ──────────────────────────

    pub fn admin(env: Env) -> Result<Address, ContractError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)
    }

    pub fn name(env: Env) -> Result<String, ContractError> {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .ok_or(ContractError::NotInitialized)
    }

    pub fn symbol(env: Env) -> Result<String, ContractError> {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .ok_or(ContractError::NotInitialized)
    }

    pub fn total_supply(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(0u32)
    }

    // ────────────────────────── Mint ──────────────────────────

    /// Mint a new token to `to` with the given URI and royalty split.
    /// Returns the new token id.
    ///
    /// Only the admin can mint.
    pub fn mint(
        env: Env,
        to: Address,
        uri: String,
        royalty_recipient: Address,
        royalty_bps: u32,
    ) -> Result<u32, ContractError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();
        if royalty_bps > MAX_BPS {
            return Err(ContractError::RoyaltyTooHigh);
        }

        let next_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(0u32);
        let token_id = next_id.checked_add(1).ok_or(ContractError::TokenAlreadyExists)?;

        // Persist token state. Re-mint should be impossible because IDs always increase.
        if env.storage().persistent().has(&DataKey::TokenOwner(token_id)) {
            return Err(ContractError::TokenAlreadyExists);
        }
        env.storage()
            .persistent()
            .set(&DataKey::TokenOwner(token_id), &to);
        env.storage()
            .persistent()
            .set(&DataKey::TokenURI(token_id), &uri);
        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyBps(token_id), &royalty_bps);
        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyRecipient(token_id), &royalty_recipient);

        bump_persistent(&env, &DataKey::TokenOwner(token_id));
        bump_persistent(&env, &DataKey::TokenURI(token_id));
        bump_persistent(&env, &DataKey::RoyaltyBps(token_id));
        bump_persistent(&env, &DataKey::RoyaltyRecipient(token_id));

        // Increment balance for `to`.
        let bal: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerBalance(to.clone()))
            .unwrap_or(0u32);
        env.storage()
            .persistent()
            .set(&DataKey::OwnerBalance(to.clone()), &(bal + 1));
        bump_persistent(&env, &DataKey::OwnerBalance(to.clone()));

        // Update next id counter.
        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &token_id);
        bump_instance(&env);

        publish_mint(&env, &to, token_id);
        Ok(token_id)
    }

    // ────────────────────────── Standard NFT ops ──────────────────────────

    /// Owner-only direct transfer.
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u32) -> Result<(), ContractError> {
        from.require_auth();
        Self::transfer_internal(&env, &from, &to, token_id)
    }

    /// Operator-mediated transfer. Either `spender` is the owner or an
    /// approved operator (set by `approve`) for this token.
    ///
    /// `_from` is intentionally a hint — the actual sender is read from
    /// authoritative storage. This prevents a caller from spoofing it.
    pub fn transfer_from(
        env: Env,
        spender: Address,
        _from: Address,
        to: Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        spender.require_auth();
        let owner: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)?;
        if spender != owner {
            let approved: Address = env
                .storage()
                .persistent()
                .get(&DataKey::TokenApproval(token_id))
                .ok_or(ContractError::Unauthorized)?;
            if approved != spender {
                return Err(ContractError::Unauthorized);
            }
        }
        Self::transfer_internal(&env, &owner, &to, token_id)
    }

    fn transfer_internal(
        env: &Env,
        from: &Address,
        to: &Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)?;
        if &stored != from {
            return Err(ContractError::Unauthorized);
        }
        env.storage()
            .persistent()
            .set(&DataKey::TokenOwner(token_id), to);
        // Clear approval, if any.
        env.storage()
            .persistent()
            .remove(&DataKey::TokenApproval(token_id));

        // Update balances.
        let from_bal: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerBalance(from.clone()))
            .unwrap_or(0u32);
        let to_bal: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerBalance(to.clone()))
            .unwrap_or(0u32);

        env.storage()
            .persistent()
            .set(&DataKey::OwnerBalance(from.clone()), &(from_bal - 1));
        env.storage()
            .persistent()
            .set(&DataKey::OwnerBalance(to.clone()), &(to_bal + 1));

        bump_persistent(env, &DataKey::TokenOwner(token_id));
        bump_persistent(env, &DataKey::OwnerBalance(from.clone()));
        bump_persistent(env, &DataKey::OwnerBalance(to.clone()));

        publish_transfer(env, from, to, token_id);
        Ok(())
    }

    /// Approve an operator for a single token. Set `operator == owner` to
    /// effectively clear approval.
    pub fn approve(
        env: Env,
        owner: Address,
        operator: Address,
        token_id: u32,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)?;
        if stored != owner {
            return Err(ContractError::Unauthorized);
        }
        if operator == owner {
            env.storage()
                .persistent()
                .remove(&DataKey::TokenApproval(token_id));
        } else {
            env.storage()
                .persistent()
                .set(&DataKey::TokenApproval(token_id), &operator);
            bump_persistent(&env, &DataKey::TokenApproval(token_id));
        }
        publish_approval(&env, &owner, &operator, token_id);
        Ok(())
    }

    // ────────────────────────── Updateable metadata ──────────────────────────

    /// Set the URI for a token. Owner-only.
    pub fn set_token_uri(
        env: Env,
        owner: Address,
        token_id: u32,
        uri: String,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)?;
        if stored != owner {
            return Err(ContractError::Unauthorized);
        }
        env.storage()
            .persistent()
            .set(&DataKey::TokenURI(token_id), &uri);
        bump_persistent(&env, &DataKey::TokenURI(token_id));
        publish_uri_update(&env, token_id);
        Ok(())
    }

    /// Set the royalty (recipient + bps) for a token. Owner-only.
    pub fn set_royalty(
        env: Env,
        owner: Address,
        token_id: u32,
        recipient: Address,
        bps: u32,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)?;
        if stored != owner {
            return Err(ContractError::Unauthorized);
        }
        if bps > MAX_BPS {
            return Err(ContractError::RoyaltyTooHigh);
        }
        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyBps(token_id), &bps);
        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyRecipient(token_id), &recipient);
        bump_persistent(&env, &DataKey::RoyaltyBps(token_id));
        bump_persistent(&env, &DataKey::RoyaltyRecipient(token_id));
        publish_royalty_update(&env, token_id);
        Ok(())
    }

    // ────────────────────────── View helpers (queried by marketplace + UI) ──────────────────────────

    pub fn owner_of(env: Env, token_id: u32) -> Result<Address, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenOwner(token_id))
            .ok_or(ContractError::TokenNotFound)
    }

    pub fn balance_of(env: Env, owner: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerBalance(owner))
            .unwrap_or(0u32)
    }

    pub fn token_uri(env: Env, token_id: u32) -> Result<String, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenURI(token_id))
            .ok_or(ContractError::TokenNotFound)
    }

    pub fn approved(env: Env, token_id: u32) -> Result<Address, ContractError> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenApproval(token_id))
            .ok_or(ContractError::TokenNotFound)
    }

    /// Royalty view used by the marketplace during settlement.
    /// Returns (recipient, basis_points). bps <= 10_000 is enforced on write.
    pub fn royalty_info(
        env: Env,
        token_id: u32,
    ) -> Result<(Address, u32), ContractError> {
        let exists = env
            .storage()
            .persistent()
            .has(&DataKey::TokenOwner(token_id));
        if !exists {
            return Err(ContractError::TokenNotFound);
        }
        let recipient: Address = env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyRecipient(token_id))
            .unwrap_or_else(|| env.storage().instance().get(&DataKey::Admin).unwrap());
        let bps: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyBps(token_id))
            .unwrap_or(0u32);
        // Touch TTLs so future reads work.
        bump_persistent(&env, &DataKey::RoyaltyRecipient(token_id));
        bump_persistent(&env, &DataKey::RoyaltyBps(token_id));
        Ok((recipient, bps))
    }
}
