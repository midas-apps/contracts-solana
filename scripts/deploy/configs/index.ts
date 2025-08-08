import { MTokenName } from "@/common/tokens";
import { DeploymentConfig } from "./types";
import { mTBILLDeploymentConfig } from "./mTBILL";

export const configsPerToken: Partial<Record<MTokenName, DeploymentConfig>> = {
  mTBILL: mTBILLDeploymentConfig,
};
