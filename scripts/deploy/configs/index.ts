import { MTokenName } from "@/common/types/tokens";
import { DeploymentConfig } from "../common/types";
import { mTBILLDeploymentConfig } from "./mTBILL";

export const configsPerToken: Record<MTokenName, DeploymentConfig> = {
  mTBILL: mTBILLDeploymentConfig,
};
