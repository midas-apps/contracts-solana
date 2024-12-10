import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as sb from "@switchboard-xyz/on-demand";
import * as anchor from "@coral-xyz/anchor";

export const getSwitchboardPullInx = async (
  provider: anchor.AnchorProvider,
  feed: PublicKey,
  env: "devnet" | "mainnet"
) => {
  const idl = await anchor.Program.fetchIdl(
    env === "devnet"
      ? "Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2"
      : undefined,
    provider
  );
  const program = new anchor.Program(idl, provider);

  const feedAccount = new sb.PullFeed(program, feed);

  const [pullIx] = await feedAccount.fetchUpdateIx({
    network: env,
  });

  return pullIx;
};
