import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  NONCE_ACCOUNT_LENGTH,
} from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { CommonParams } from './dataFeed';

export interface DeployNonceAccountConfig {
  /** The authority that can use the nonce (typically a Fordefi vault address) */
  authority: PublicKey;
}

/**
 * Deploys a durable nonce account for Solana transactions.
 *
 * Durable nonces allow transactions to remain valid indefinitely,
 * unlike regular transactions that expire after ~1-2 minutes.
 *
 * @param common - Common deployment parameters (provider, payer, network)
 * @param config - Nonce account configuration
 * @returns The public key of the deployed nonce account
 */
export async function deployNonceAccount(
  common: CommonParams,
  config: DeployNonceAccountConfig,
): Promise<PublicKey> {
  const { authority } = config;
  const nonceKeypair = Keypair.generate();
  const connection = common.provider.connection;

  const lamports = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH);

  console.log(`Creating nonce account: ${nonceKeypair.publicKey.toBase58()}`);
  console.log(`Authority: ${authority.toBase58()}`);
  console.log(`Rent-exempt lamports: ${lamports}`);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: common.payer.publicKey,
      newAccountPubkey: nonceKeypair.publicKey,
      lamports,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: nonceKeypair.publicKey,
      authorizedPubkey: authority,
    }),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [nonceKeypair], {
    action: 'deployer',
    comment: `Deploy Nonce Account for ${authority.toBase58().slice(0, 8)}...`,
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  if (result.signature) {
    console.log(`Transaction signature: ${result.signature}`);
  }

  console.log(`✓ Nonce account deployed: ${nonceKeypair.publicKey.toBase58()}`);

  return nonceKeypair.publicKey;
}
