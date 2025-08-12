import { DeploymentConfig } from "../common/types";
import { parsePercent, parseUnits } from "@/test/helpers/common.helpers";

export const mTBILLDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    dataFeed: {
      maxPrice: parseUnits("100000"),
      minPrice: parseUnits("0.1"),
      maxStaleness: 86400,
      mode: "switchboard",
    },
  },
  networkConfigs: {
    devnet: {
      rv: {
        instantFee: parsePercent(1),
        greenListEnforced: false,
        instantDailyLimit: parseUnits("10000"),
        minAmount: parseUnits("0.01"),
        variationTolerance: parsePercent(1),
        fiatFlatFee: parseUnits("1"),
        minFiatRedeemAmount: parseUnits("10"),
      },
      dv: {
        instantFee: parsePercent(1),
        firstMintMinMTokens: parseUnits("10"),
        greenListEnforced: false,
        instantDailyLimit: parseUnits("10000"),
        minAmount: parseUnits("1"),
        variationTolerance: parsePercent(1),
      },
      dvUstb: undefined,
      rvBuidl: undefined,
      rvSwapper: undefined,
    },
    mainnet: undefined,
  },
};
