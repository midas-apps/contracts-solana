import { parseUnits } from "@/test/helpers/common.helpers";
import { DeploymentConfig } from "./types";

export const mTBILLDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    // customAggregator: {
    //   minAnswer: parseUnits("0.1"),
    //   maxAnswer: parseUnits("1000"),
    //   maxAnswerDeviation: parseUnits("0.05"),
    //   description: "mTBILL/USD",
    // },
  },
  networkConfigs: {
    devnet: {
      dataFeed: {
        minPrice: parseUnits("0.1"),
        maxPrice: parseUnits("1000"),
        maxStaleness: 2592000,
      },
    },
  },
};
