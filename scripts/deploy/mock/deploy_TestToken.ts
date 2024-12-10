import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import {
  AuthorityType,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { executeAnchorScript } from "@/common/utils";
import { createAtaInx, parseUnits } from "@/test/helpers/common.helpers";

// TODO: change config before execution
const config = {
  metadata: {
    additionalMetadata: [],
    name: "Test USDC",
    symbol: "USDC",
    uri: "TODO",
  },
  decimals: 6,
  programId: TOKEN_PROGRAM_ID,
} as {
  metadata: Omit<TokenMetadata, "updateAuthority" | "mint">;
  decimals: number;
  programId: PublicKey;
};

async function main(provider: AnchorProvider, payer: Keypair) {
  const mint = Keypair.generate();

  const fullMetadata = {
    ...config.metadata,
    mint: mint.publicKey,
    updateAuthority: payer.publicKey,
  };

  const mintLen = getMintLen([]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(fullMetadata).length;

  const mintLamports =
    await provider.connection.getMinimumBalanceForRentExemption(
      mintLen + metadataLen
    );

  const authority = payer.publicKey;

  const ata = getAssociatedTokenAddressSync(
    mint.publicKey,
    payer.publicKey,
    true,
    config.programId
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports: mintLamports,
        programId: config.programId,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        config.decimals,
        authority,
        authority,
        config.programId
      ),
      createAtaInx(
        payer.publicKey,
        ata,
        mint.publicKey,
        payer.publicKey,
        config.programId
      ),
      createMintToInstruction(
        mint.publicKey,
        ata,
        payer.publicKey,
        parseUnits("10000000", config.decimals)
      )
    ),
    [payer, mint],
    {
      commitment: "finalized",
    }
  );

  console.log({ txRes, mint: mint.publicKey });
}

executeAnchorScript(main);
