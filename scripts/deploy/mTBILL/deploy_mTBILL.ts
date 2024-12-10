import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import { createMTokenMint } from "../../../common/create-mtoken-mint";
import { executeAnchorScript } from "../../../common/utils";

async function main(provider: AnchorProvider, payer: Keypair) {
  const createdMint = await createMTokenMint({
    authority: payer.publicKey,
    connection: provider.connection,
    metadata: {
      name: "Midas US Treasury Bill Token",
      symbol: "mTBILL",
      additionalMetadata: [],
      uri: "https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mtbill-metadata",
    },
    payer,
  });

  console.log("Mint: ", createdMint.publicKey);
}

executeAnchorScript(main);
