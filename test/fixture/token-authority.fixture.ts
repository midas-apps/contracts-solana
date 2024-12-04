import { initBankrun, processTransaction } from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as TOKEN_AUTHORITY_IDL from "../../target/idl/token_authority.json";

import { AccessControl } from "@/target/types/access_control";
import { Transaction } from "@solana/web3.js";
import {
  acRoleToBuffer,
  generateAcRoleAccount,
  getAccountAcRoleStatePda,
} from "../helpers/ac.helpers";
import { generateAcAccount } from "../helpers/vaults.helpers";
import { AC_ROLES } from "../constants/ac.constants";
import { TokenAuthority } from "@/target/types/token_authority";
import { AccessControlFixtureReturnType } from "./ac.fixture";
import { newTokenAuthority } from "../testers/token-authority.testers";
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from "../helpers/token-authority.helpers";
import { TOKEN_AUTHORITY_ROLES } from "../constants/token-authority.constants";

export const tokenAuthorityFixture = async (
  acFixture: AccessControlFixtureReturnType
) => {
  const { provider, context, accounts, authority, ...regularAccounts } =
    acFixture;

  const tokenAuthorityProgram = new Program<TokenAuthority>(
    TOKEN_AUTHORITY_IDL as any,
    provider
  );

  const mTBillMinterAuthoritySeed = "mtbill-mint-authority";

  const createFeedTx = new Transaction().add(
    await tokenAuthorityProgram.methods
      .newTokenAuthority(
        Array.from(
          Uint8Array.from(mintAuthoritySeedToBuffer(mTBillMinterAuthoritySeed))
        ),
        acFixture.acRoleMTbill.publicKey
      )
      .accountsPartial({
        signer: authority.publicKey,
        tokenAuthority: getTokenAuthorityPda(mTBillMinterAuthoritySeed),
      })
      .instruction(),
    await acFixture.acProgram.methods
      .grantRole(acRoleToBuffer(TOKEN_AUTHORITY_ROLES.M_MINTER))
      .accountsPartial({
        account: authority.publicKey,
        acRole: acFixture.acRoleMTbill.publicKey,
        authority: authority.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acFixture.acRoleMTbill.publicKey,
          authority.publicKey,
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acFixture.acRoleMTbill.publicKey,
          authority.publicKey,
          TOKEN_AUTHORITY_ROLES.M_MINTER
        ),
      })
      .instruction()
  );

  await processTransaction(context, createFeedTx, [authority]);

  return {
    ...acFixture,
    tokenAuthorityProgram,
    mTBillMinterAuthoritySeed,
  };
};

export type TokenAuthorityFixtureReturnType = Awaited<
  ReturnType<typeof tokenAuthorityFixture>
>;
