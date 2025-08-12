import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import * as TOKEN_AUTHORITY_IDL from "../../../target/idl/token_authority.json";
import { CommonParams, getNetwork } from "./common";
import { getAccountAcRoleStatePda } from "../../../test/helpers/ac.helpers";
import { AC_ROLES } from "../../../test/constants/ac.constants";
import { AccessControl } from "../../../target/types/access_control";
import { TokenAuthority } from "@/target/types/token_authority";
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from "@/test/helpers/token-authority.helpers";
import { MTokenName } from "@/common/types/tokens";
import { getAddresses } from "@/common/addresses";

export const getTokenAuthorityProgram = (provider: AnchorProvider) => {
  return new Program<TokenAuthority>(TOKEN_AUTHORITY_IDL as any, provider);
};

export type DeployTokenAuthorityConfig = {
  acRole: PublicKey;
  seed: string;
};

export const deployTokenAuthority = async (
  common: CommonParams,
  token: MTokenName,
) => {
  const network = getNetwork(common.provider);
  const addresses = getAddresses(network);
  const tokenAddresses = addresses[token];

  if (!tokenAddresses) {
    throw new Error("Token config is not found");
  }
  const {
    tokenAuthority: { seed },
    acRole,
  } = tokenAddresses;

  const tokenAuthorityProgram = getTokenAuthorityProgram(common.provider);

  const authority = getTokenAuthorityPda(seed);
  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(
      Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))),
      acRole,
    )
    .accountsPartial({
      signer: common.payer.publicKey,
      tokenAuthority: getTokenAuthorityPda(seed),
    })
    .transaction();

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer],
    {
      commitment: "finalized",
    },
  );

  console.log({
    txRes,
    authority,
    seed,
  });

  return authority;
};
