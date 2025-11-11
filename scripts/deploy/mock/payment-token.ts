import {
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

import { createAtaInx, parseUnits } from '@/test/helpers/common.helpers';

export interface MockPaymentTokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
}

export async function createMockPaymentTokenMint({
  connection,
  payer,
  authority,
  config,
  mint,
}: {
  connection: Connection;
  payer: Keypair;
  authority: PublicKey;
  config: MockPaymentTokenConfig;
  mint?: Keypair;
}): Promise<PublicKey> {
  mint ??= Keypair.generate();

  const mintLen = getMintLen([]);
  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const ata = getAssociatedTokenAddressSync(
    mint.publicKey,
    payer.publicKey,
    true,
    TOKEN_PROGRAM_ID,
  );

  const initialSupplyAmount = parseUnits(config.initialSupply, config.decimals);
  const initialSupplyNumber = Number(initialSupplyAmount);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
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
    createAtaInx(payer.publicKey, ata, mint.publicKey, payer.publicKey, TOKEN_PROGRAM_ID),
    createMintToInstruction(
      mint.publicKey,
      ata,
      authority,
      initialSupplyNumber,
      undefined,
      TOKEN_PROGRAM_ID,
    ),
  );

  await sendAndConfirmTransaction(connection, transaction, [payer, mint], {
    commitment: 'finalized',
  });

  return mint.publicKey;
}
