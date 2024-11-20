import { PublicKey } from "@solana/web3.js";

export enum ANCHOR_ERRORS {
  AccountAlreadyInUse,
  InsufficientFunds = 1,
  AccountNotInitialized = 3012,
}

export const DAY = 86400;
export const ZERO_ADDRESS = new PublicKey(0);
