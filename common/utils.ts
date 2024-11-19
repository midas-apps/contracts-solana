import { AnchorProvider } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";

export const executeAnchorScript = async (
  scriptFn: (provider: AnchorProvider, wallet: Keypair) => Promise<unknown>
) => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = new Keypair((provider.wallet as any).payer._keypair);

  try {
    await scriptFn(provider, payer);
  } catch (e) {
    console.error("ERROR! 🔴");
    console.error(e);
  }
};
