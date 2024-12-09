import { PublicKey } from "@solana/web3.js";

export enum ANCHOR_ERRORS {
  AccountAlreadyInUse,
  InsufficientFunds = 1,
  AccountNotInitialized = 3012,
}

export const DAY = 86400n;
export const ONE = 10n ** 9n;

export const MAX_U128 = 340_282_366_920_938_463_463_374_607_431_768_211_455n;
export const DEFAULT_PUBKEY = new PublicKey(0);

export enum CommonError {
  AccountIsNotInitialized = 3012,
  AccountIsAlreadyInitialized = 0,
  GenericError = "Program failed to complete",
  SplInsufficientFunds = "custom program error: 0x1",
  SplOwnerDoesNotMatch = "custom program error: 0x4",
}
