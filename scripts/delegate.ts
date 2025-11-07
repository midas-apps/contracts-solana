import { AnchorProvider } from '@coral-xyz/anchor';
import { createApproveInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';
import { MAX_U64 } from '@/test/constants/common.constants';
import { findATA } from '@/test/helpers/common.helpers';

import { getFeedAddresses, getTokenAddresses } from './utils/addressManager';
import { getMtoken, getNetwork, getPaymentToken } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();

  console.log(`╔════════════════════════════════════════════════╗`);
  console.log(`║            Delegate Script                   ║`);
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`Token: ${mtoken}`);
  console.log(`Payment Token: ${paymentToken}`);
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.redeemer?.account) {
    throw new Error(`Redeemer vault account not found for ${mtoken} on ${network}`);
  }

  // Get payment token feed address
  const feedAddr = getFeedAddresses(network, paymentToken);
  if (!feedAddr?.token) {
    throw new Error(`Payment token mint not found for ${paymentToken} on ${network}`);
  }

  const mint = feedAddr.token;
  const redeemerAccount = tokenAddrs.redeemer.account;
  const tokenProgram = feedAddr.tokenProgram || TOKEN_PROGRAM_ID;

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

  console.log(`✅ Delegation completed successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
