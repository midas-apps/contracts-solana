import { PublicKey } from "@solana/web3.js";

export enum ANCHOR_ERRORS {
  AccountAlreadyInUse,
  InsufficientFunds = 1,
  AccountNotInitialized = 3012,
}

export const DAY = 86400;

export const MAX_U128 = 340_282_366_920_938_463_463_374_607_431_768_211_455n;
export const ZERO_ADDRESS = new PublicKey(0);
