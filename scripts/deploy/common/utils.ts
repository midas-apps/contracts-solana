import { Network } from '@/common/types';
import { DeploymentConfig } from './types';
import { MTokenName } from '@/common/types/tokens';
import { configsPerToken } from '../configs';
import { AnchorExtendedProvider } from '@/common/utils';

export const getNetworkConfig = <
  TConfigKey extends keyof DeploymentConfig['networkConfigs'][Network],
  TConfig extends DeploymentConfig['networkConfigs'][Network][TConfigKey],
>(
  network: Network,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = configsPerToken[token]?.networkConfigs?.[network]?.[
    configKey
  ] as TConfig;

  if (!config) {
    throw new Error('Deployment config is not found');
  }

  return config;
};

export const getDeploymentGenericConfig = <
  TConfigKey extends keyof DeploymentConfig['genericConfigs'],
  TConfig extends DeploymentConfig['genericConfigs'][TConfigKey],
>(
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = configsPerToken[token]?.genericConfigs?.[configKey] as TConfig;

  if (!config) {
    throw new Error('Deployment config is not found');
  }

  return config;
};

export const getMTokenOrThrow = (provider: AnchorExtendedProvider) => {
  const mToken = provider.mtoken;
  if (!mToken) {
    throw new Error(
      'MToken parameter not found. Add --mtoken=<mtoken> to the command line',
    );
  }
  return mToken;
};

export const getPaymentTokenOrThrow = (provider: AnchorExtendedProvider) => {
  const pToken = provider.ptoken;
  if (!pToken) {
    throw new Error(
      'PaymentToken parameter not found. Add --ptoken=<ptoken> to the command line',
    );
  }
  return pToken;
};

export const getPaymentAndMTokenOrThrow = (
  provider: AnchorExtendedProvider,
) => {
  const pToken = getPaymentTokenOrThrow(provider);
  const mToken = getMTokenOrThrow(provider);
  return { pToken, mToken };
};

export const getAmountOrThrow = (provider: AnchorExtendedProvider) => {
  const amount = provider.amount;
  if (!amount) {
    throw new Error(
      'Amount parameter not found. Add --amount=<amount> to the command line',
    );
  }
  return amount;
};
