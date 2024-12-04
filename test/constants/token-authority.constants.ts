import { PublicKey } from "@solana/web3.js";

export const TOKEN_AUTHORITY_PROGRAM_ID = new PublicKey(
  "6XqSwGFEuadyqXC9vBLYGJhvQsEVjPdCrtvN6inAb4z3"
);

export const TOKEN_AUTHORITY_SEEDS = {
  MINT_AUTHORITY: "mint_authority",
};

export const TOKEN_AUTHORITY_ROLES = {
  M_MINTER: "m_minter_role",
};

export enum TokenAuthorityError {
  NotAuthority = 6000,
}
