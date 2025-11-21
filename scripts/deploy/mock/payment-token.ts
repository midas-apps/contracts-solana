import { AnchorProvider } from '@coral-xyz/anchor';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import { createAtaInx, parseUnits } from '@/test/helpers/common.helpers';

export interface MockPaymentTokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
}

export async function createMockPaymentTokenMint({
  provider,
  authority,
  config,
  mint,
}: {
  provider: AnchorProvider;
  authority: PublicKey;
  config: MockPaymentTokenConfig;
  mint?: Keypair;
}): Promise<PublicKey> {
  const payer = provider.wallet.publicKey;
  const connection = provider.connection;
  mint ??= Keypair.generate();

  const mintLen = getMintLen([]);
  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer, true, TOKEN_PROGRAM_ID);

  const initialSupplyAmount = parseUnits(config.initialSupply, config.decimals);
  const initialSupplyNumber = Number(initialSupplyAmount);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mint.publicKey,
      config.decimals,
      authority,
      authority,
      TOKEN_PROGRAM_ID,
    ),
    createAtaInx(payer, ata, mint.publicKey, payer, TOKEN_PROGRAM_ID),
    createMintToInstruction(
      mint.publicKey,
      ata,
      authority,
      initialSupplyNumber,
      undefined,
      TOKEN_PROGRAM_ID,
    ),
  );

  await provider.sendAndConfirm(transaction, [mint], {
    commitment: 'finalized',
  });

  return mint.publicKey;
}
