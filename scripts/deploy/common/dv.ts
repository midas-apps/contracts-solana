import { PublicKey } from "@solana/web3.js";

export type DeployDvConfigCommon = {
  greenListEnforced: boolean;
  tokensReceiver?: PublicKey;
  feeReceiver?: PublicKey;
  instantFee: bigint;
  instantDailyLimit: bigint;
  variationTolerance: bigint;
  minAmount: bigint;
  firstMintMinMTokens: bigint;
};
