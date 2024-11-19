import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import { createMTokenMint } from "../common/create-mtoken-mint";
import { executeAnchorScript } from "../common/utils";

async function main(provider: AnchorProvider, payer: Keypair) {
  const createdMint = await createMTokenMint({
    authority: payer.publicKey,
    connection: provider.connection,
    metadata: {
      name: "mTBILL",
      symbol: "mTBILL",
      additionalMetadata: [],
      uri: "TODO",
    },
    payer,
  });

  console.log("Mint: ", createdMint.publicKey);
}

executeAnchorScript(main);
