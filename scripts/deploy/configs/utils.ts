import { MTokenName } from "@/common/tokens";
import { DeploymentConfig } from "./types";
import { configsPerToken } from ".";
import { Cluster } from "@/common/addresses";

export const getDeploymentGenericConfig = <
  TConfigKey extends keyof DeploymentConfig["genericConfigs"],
  TConfig extends DeploymentConfig["genericConfigs"][TConfigKey]
>(
  token: MTokenName,
  configKey: TConfigKey
) => {
  const config = configsPerToken[token]?.genericConfigs?.[configKey] as TConfig;

  if (!config) {
    throw new Error("Deployment config is not found");
  }

  return config;
};

export const getNetworkConfig = <
  TConfigKey extends keyof DeploymentConfig["networkConfigs"][Cluster],
  TConfig extends DeploymentConfig["networkConfigs"][Cluster][TConfigKey]
>(
  cluster: Cluster,
  token: MTokenName,
  configKey: TConfigKey
) => {
  const config = configsPerToken[token]?.networkConfigs?.[cluster]?.[
    configKey
  ] as TConfig;

  if (!config) {
    throw new Error("Deployment config is not found");
  }

  return config;
};
