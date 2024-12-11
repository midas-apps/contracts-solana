import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import {
  createMTBillTokenMint,
  createMTokenMint,
} from "../../../common/create-mtoken-mint";
import { executeAnchorScript } from "../../../common/utils";

async function main(provider: AnchorProvider, payer: Keypair) {
  const createdMint = await createMTBillTokenMint({
    authority: payer.publicKey,
    connection: provider.connection,
    payer,
  });

  console.log("Mint: ", createdMint.publicKey);
}

executeAnchorScript(main);
