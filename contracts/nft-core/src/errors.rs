//! Error types for the NFT contract.
//!
//! Each variant maps to a stable `u32` status code that clients can pattern-match on.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// Contract has already been initialized; `initialize` cannot be called twice.
    AlreadyInitialized = 1,
    /// Contract has not been initialized; admin-gated functions cannot be used.
    NotInitialized = 2,
    /// The caller is not authorized to perform the requested action.
    Unauthorized = 3,
    /// The requested token does not exist.
    TokenNotFound = 4,
    /// The token already exists; cannot mint with an explicit ID twice.
    TokenAlreadyExists = 5,
    /// Approval for the requested operator does not exist.
    ApprovalNotFound = 6,
    /// The proposed royalty exceeds the maximum allowed (100%).
    RoyaltyTooHigh = 7,
    /// Operator is forbidden from transferring tokens to themselves.
    SelfApproval = 8,
    /// The recipient has already been approved for this token.
    /// Returning this for duplicate approvals is mostly a UX concern.
    ApprovalAlreadyExists = 9,
}
