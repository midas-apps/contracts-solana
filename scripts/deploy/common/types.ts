import { Network } from "@/common/types";
import { DeployRvConfigCommon } from "./rv";
import { DeployDvConfigCommon } from "./dv";
import { DataFeedMode } from "@/test/helpers/ac.helpers";

export type DeploymentConfig = {
  genericConfigs: {
    customAggregator?: any;
    customAggregatorDiscounted?: any;
    dataFeed?: {
      mode: keyof typeof DataFeedMode;
      minPrice: bigint;
      maxPrice: bigint;
      maxStaleness: number;
    };
  };
  networkConfigs: Record<
    Network,
    {
      dv?: DeployDvConfigCommon;
      dvUstb?: DeployDvConfigCommon;
      rv?: DeployRvConfigCommon;
      rvBuidl?: DeployRvConfigCommon;
      rvSwapper?: DeployRvConfigCommon;
      postDeploy?: {
        addPaymentTokens?: any;
        grantRoles?: any;
        setRoundData?: any;
        addFeeWaived?: any;
      };
    }
  >;
};
