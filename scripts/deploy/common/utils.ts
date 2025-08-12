import { Network } from "@/common/types";
import { DeploymentConfig } from "./types";
import { MTokenName } from "@/common/types/tokens";
import { configsPerToken } from "../configs";

export const getNetworkConfig = <
  TConfigKey extends keyof DeploymentConfig["networkConfigs"][Network],
  TConfig extends DeploymentConfig["networkConfigs"][Network][TConfigKey],
>(
  network: Network,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = configsPerToken[token]?.networkConfigs?.[network]?.[
    configKey
  ] as TConfig;

  if (!config) {
    throw new Error("Deployment config is not found");
  }

  return config;
};

export const getDeploymentGenericConfig = <
  TConfigKey extends keyof DeploymentConfig["genericConfigs"],
  TConfig extends DeploymentConfig["genericConfigs"][TConfigKey],
>(
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = configsPerToken[token]?.genericConfigs?.[configKey] as TConfig;

  if (!config) {
    throw new Error("Deployment config is not found");
  }

  return config;
};
