import { PublicKey } from "@solana/web3.js";

export type DeployRvConfigCommon = {
  feeReceiver?: PublicKey;
  tokensReceiver?: PublicKey;
  instantDailyLimit: bigint;
  instantFee: bigint;
  enableSanctionsList?: boolean;

  variationTolerance: bigint;
  greenListEnforced: boolean;
  minAmount: bigint;
  fiatAdditionalFee?: bigint;
  fiatFlatFee: bigint;
  minFiatRedeemAmount: bigint;
  requestRedeemer?: PublicKey;
};
