import { Program } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { TokenAuthority } from 'target/types/token_authority';

import TOKEN_AUTHORITY_IDL from '../../target/idl/token_authority.json' with { type: 'json' };
import { AC_ROLES } from '../constants/ac.constants';
import { TOKEN_AUTHORITY_ROLES } from '../constants/token-authority.constants';
import { acRoleToBuffer, getAccountAcRoleStatePda } from '../helpers/ac.helpers';
import { processTransaction } from '../helpers/common.helpers';
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from '../helpers/token-authority.helpers';

import { AccessControlFixtureReturnType } from './ac.fixture';

export const tokenAuthorityFixture = async (acFixture: AccessControlFixtureReturnType) => {
  const { provider, context, authority } = acFixture;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenAuthorityProgram = new Program<TokenAuthority>(TOKEN_AUTHORITY_IDL as any, provider);

  const mTBillMinterAuthoritySeed = 'mtbill-mint-authority';

  const createFeedTx = new Transaction().add(
    await tokenAuthorityProgram.methods
      .newTokenAuthority(
        Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(mTBillMinterAuthoritySeed))),
        acFixture.acRoleMTbill.publicKey,
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
          AC_ROLES.ADMIN,
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acFixture.acRoleMTbill.publicKey,
          authority.publicKey,
          TOKEN_AUTHORITY_ROLES.M_MINTER,
        ),
      })
      .instruction(),
  );

  await processTransaction(context, createFeedTx, [authority]);

  return {
    ...acFixture,
    tokenAuthorityProgram,
    mTBillMinterAuthoritySeed,
  };
};

export type TokenAuthorityFixtureReturnType = Awaited<ReturnType<typeof tokenAuthorityFixture>>;
