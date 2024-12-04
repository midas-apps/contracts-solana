import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import {
  DataFeedProgram,
  findPDA,
  toBN,
  TokenAuthorityProgram,
  VaultsProgram,
} from "./common.helpers";
import {
  DATA_FEED_PROGRAM_ID,
  DATA_FEED_SEEDS,
} from "../constants/data-feed.constants";
import { VAULTS_PROGRAM_ID, VAULTS_SEEDS } from "../constants/vaults.constants";
import { BN } from "@coral-xyz/anchor";
import keccak256 from "keccak256";
import {
  TOKEN_AUTHORITY_PROGRAM_ID,
  TOKEN_AUTHORITY_SEEDS,
} from "../constants/token-authority.constants";

export type PaymentMint = {
  mint: PublicKey;
  feed: Keypair;
  decimals: number;
};

export const fetchTokenAuthorityState = async (
  program: TokenAuthorityProgram,
  tokenAuthority: PublicKey,
  allowNull = false
) => {
  // TODO: refactor
  try {
    return await program.account.tokenAuthorityState.fetchNullable(
      tokenAuthority
    );
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const mintAuthoritySeedToBuffer = (seed: string) => {
  return keccak256(Buffer.from(seed));
};

export const getTokenAuthorityPda = (seed: string | Buffer) => {
  const buff =
    seed instanceof Buffer ? seed : mintAuthoritySeedToBuffer(seed as string);

  const [pda] = findPDA(
    [TOKEN_AUTHORITY_SEEDS.MINT_AUTHORITY, buff],
    TOKEN_AUTHORITY_PROGRAM_ID
  );
  return pda;
};
