//! Errors for the marketplace contract.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    ListingNotFound = 4,
    AuctionNotFound = 5,
    AuctionAlreadyHasBids = 6,
    AuctionNotEnded = 7,
    AuctionAlreadyEnded = 8,
    InvalidAmount = 9,
    BidTooLow = 10,
    DurationTooShort = 11,
    DurationTooLong = 12,
    SelfListing = 13,
    NotSeller = 14,
    RoyaltyBpsInvalid = 15,
    FeeBpsInvalid = 16,
    NftTransferFailed = 17,
    TokenTransferFailed = 18,
    ArithmeticOverflow = 19,
    SelfBid = 20,
}
