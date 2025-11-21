import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  AuthorityType,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTokenAddresses } from '../../utils/addressQueries';
import {
  getMtoken,
  getNetwork,
  getAuthorityType,
  getOptionalArg,
} from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const authorityType = getAuthorityType();
  const currentAuthority = getOptionalArg('current-authority');
  const newAuthority = getOptionalArg('new-authority');

  console.log(`Transferring ${authorityType} authority for ${mtoken}`);

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mToken) {
    throw createUserError(`mToken not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-core --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  // Map authority type string to AuthorityType enum
  const authorityTypeMap: Record<string, AuthorityType> = {
    MintTokens: AuthorityType.MintTokens,
    FreezeAccount: AuthorityType.FreezeAccount,
    AccountOwner: AuthorityType.AccountOwner,
    CloseAccount: AuthorityType.CloseAccount,
  };

  const authorityTypeEnum = authorityTypeMap[authorityType];
  if (authorityTypeEnum === undefined) {
    throw createUserError(`Invalid authority type: ${authorityType}`, [
      'Must be one of: MintTokens, FreezeAccount, AccountOwner, CloseAccount',
    ]);
  }

  const account = tokenAddrs.mToken;
  const currentAuthorityPubkey = currentAuthority
    ? new PublicKey(currentAuthority)
    : payer.publicKey;
  const newAuthorityPubkey = newAuthority ? new PublicKey(newAuthority) : payer.publicKey;

  const txRes = await provider.sendAndConfirm(
    new Transaction().add(
      createSetAuthorityInstruction(
        account,
        currentAuthorityPubkey,
        authorityTypeEnum,
        newAuthorityPubkey,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      ),
    ),
    [],
    {
      commitment: 'finalized',
    },
  );

  console.log(`✅ Authority transferred successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-ac');
