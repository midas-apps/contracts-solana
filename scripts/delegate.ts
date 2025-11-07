import { AnchorProvider } from '@coral-xyz/anchor';
import { createApproveInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
import { MProduct } from '@/common/tokenTypes';
import { MAX_U64 } from '@/test/constants/common.constants';
import { findATA } from '@/test/helpers/common.helpers';

import { executeAnchorScript } from '../common/utils';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mint = new PublicKey('FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e');

  const tx = new Transaction().add(
    createApproveInstruction(
      findATA(mint, payer.publicKey, TOKEN_PROGRAM_ID),
      addresses['devnet'].tokens[MProduct.MTBILL].redeemer.account,
      payer.publicKey,
      MAX_U64,
      undefined,
      TOKEN_PROGRAM_ID,
    ),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  console.log({ txRes });
}

executeAnchorScript(main);
