import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import * as DATA_FEED_IDL from "../../../target/idl/data_feed.json";
import { DataFeedMode } from "../../../test/helpers/ac.helpers";
import { toBN } from "../../../test/helpers/common.helpers";
import { DataFeed } from "../../../target/types/data_feed";
import { Network } from "@/common/types";
import { MTokenName } from "@/common/types/tokens";
import { getAddresses } from "@/common/addresses";
import { getDeploymentGenericConfig } from "./utils";

export type CommonParams = {
  provider: AnchorProvider;
  payer: Keypair;
};

export const getDataFeedProgram = (provider: AnchorProvider) => {
  return new Program<DataFeed>(DATA_FEED_IDL as any, provider);
};

export type DeployDataFeedConfig = {
  acRole: PublicKey;
  feed?: Keypair;
  mode: keyof typeof DataFeedMode;
  underlyingFeed: PublicKey;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
};

export const deployDataFeed = async (
  common: CommonParams,
  token: MTokenName,
) => {
  const network = getNetwork(common.provider);
  const addresses = getAddresses(network);
  const tokenAddresses = addresses[token];

  let { acRole } = tokenAddresses ?? {};

  acRole ??= addresses.acRoleGlobal;

  const { underlyingFeed } = addresses.feeds[token];

  const { minPrice, maxPrice, maxStaleness, mode } = getDeploymentGenericConfig(
    token,
    "dataFeed",
  );

  const feed = Keypair.generate();

  const dataFeedProgram = getDataFeedProgram(common.provider);

  const tx = new Transaction().add(
    await dataFeedProgram.methods
      .newFeed(
        acRole,
        underlyingFeed,
        DataFeedMode[mode],
        toBN(minPrice),
        toBN(maxPrice),
        maxStaleness,
      )
      .accounts({
        feed: feed.publicKey,
        payer: common.payer.publicKey,
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, feed],
    {
      commitment: "finalized",
    },
  );

  console.log({
    txRes,
    feed: feed.publicKey,
  });

  return feed.publicKey;
};

export const getNetwork = (provider: AnchorProvider): Network => {
  const rpcEndpoint = provider.connection.rpcEndpoint;

  console.log("Rpc endpoint", rpcEndpoint);

  if (rpcEndpoint.includes("devnet")) {
    return "devnet";
  }
  return "mainnet";
};
