import { AnchorProvider } from '@coral-xyz/anchor';
import { createApproveInstruction } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { MAX_U64 } from '@/test/constants/common.constants';
import { findATA } from '@/test/helpers/common.helpers';

import {
  requireRedeemerVaultAccount,
  requirePaymentTokenFeed,
} from '../../utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();

  console.log(`Delegating ${paymentToken} for ${mtoken}`);

  // Get token addresses
  const redeemerAccount = requireRedeemerVaultAccount(network, mtoken);

  // Get payment token feed address
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  const mint = feedAddr.token;
  const tokenProgram = feedAddr.tokenProgram;

  const tx = new Transaction().add(
    createApproveInstruction(
      findATA(mint, payer.publicKey, tokenProgram),
      redeemerAccount,
      payer.publicKey,
      MAX_U64,
      undefined,
      tokenProgram,
    ),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  console.log(`✅ Delegation completed successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
