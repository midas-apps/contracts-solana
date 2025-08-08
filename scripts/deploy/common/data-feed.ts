import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import * as DATA_FEED_IDL from "../../../target/idl/data_feed.json";
import { toBN } from "../../../test/helpers/common.helpers";
import { DataFeed } from "../../../target/types/data_feed";
import { MTokenName } from "@/common/tokens";
import { getNetworkConfig } from "../configs/utils";
import { addresses, Cluster } from "@/common/addresses";
import { DataFeedMode } from "@/test/helpers/data-feed.helpers";
import { CommonParams } from "@/common/utils";

export const getDataFeedProgram = (provider: AnchorProvider) => {
  return new Program<DataFeed>(DATA_FEED_IDL as any, provider);
};

export type DeployDataFeedConfig = {
  mode?: keyof typeof DataFeedMode;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
};

type DeployDataFeedInternalConfig = {
  acRole: PublicKey;
  feed?: Keypair;
  mode: keyof typeof DataFeedMode;
  underlyingFeed: PublicKey;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
};

export const deployMTokenDataFeed = async (
  common: CommonParams,
  mToken: MTokenName
) => {
  const config = getNetworkConfig(common.cluster, mToken, "dataFeed");
  const networkAddresses = addresses[common.cluster];
  const mTokenAddresses = networkAddresses?.tokenAddresses?.[mToken];

  const underlyingFeed = mTokenAddresses?.mTokenDataFeed?.underlyingFeed;

  if (!underlyingFeed || !mTokenAddresses?.acRole) {
    throw new Error("Missing required params for mtoken data feed deploy");
  }

  return await deployDataFeed(common, {
    mode: underlyingFeed.mode,
    maxPrice: config.maxPrice,
    maxStaleness: config.maxStaleness,
    minPrice: config.minPrice,
    acRole: mTokenAddresses?.acRole,
    underlyingFeed: underlyingFeed.pubkey,
  });
};

const deployDataFeed = async (
  common: CommonParams,
  {
    mode,
    maxPrice,
    maxStaleness,
    minPrice,
    acRole,
    underlyingFeed,
    feed,
  }: DeployDataFeedInternalConfig
) => {
  feed ??= Keypair.generate();

  const dataFeedProgram = getDataFeedProgram(common.provider);

  const tx = new Transaction().add(
    await dataFeedProgram.methods
      .newFeed(
        acRole,
        underlyingFeed,
        DataFeedMode[mode],
        toBN(minPrice),
        toBN(maxPrice),
        maxStaleness
      )
      .accounts({
        feed: feed.publicKey,
        payer: common.payer.publicKey,
      })
      .instruction()
  );

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, feed],
    {
      commitment: "finalized",
    }
  );

  console.log({
    txRes,
    feed: feed.publicKey,
  });

  return feed.publicKey;
};
