import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import { createMTokenMint } from "../common/create-mtoken-mint";
import { executeAnchorScript } from "../common/utils";
import {
  AuthorityType,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { addresses } from "@/common/addresses";

// TODO: change config before execution
const config = {
  // currentAuthority: new PublicKey(
  //   "So11111111111111111111111111111111111111112"
  // ),
  account: addresses["devnet"].mTBILL.mToken,
  newAuthority: addresses["devnet"].mTBILL.tokenAuthority.account,
  authorityType: AuthorityType.FreezeAccount,
  programId: TOKEN_2022_PROGRAM_ID,
} as {
  currentAuthority?: PublicKey;
  account: PublicKey;
  newAuthority?: PublicKey;
  authorityType: AuthorityType;
  programId?: PublicKey;
};

async function main(provider: AnchorProvider, payer: Keypair) {
  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    new Transaction().add(
      createSetAuthorityInstruction(
        config.account,
        config.currentAuthority ?? payer.publicKey,
        config.authorityType,
        config.newAuthority ?? payer.publicKey,
        undefined,
        config.programId ?? TOKEN_2022_PROGRAM_ID
      )
    ),
    [payer],
    {
      commitment: "finalized",
    }
  );

  console.log({ txRes });
}

executeAnchorScript(main);
