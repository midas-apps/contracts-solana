import { PaymentToken } from '@/common/tokenTypes';
import { PaymentTokenDeploymentConfig } from '@/scripts/configs/types';

export const paymentTokenConfigs: Partial<Record<PaymentToken, PaymentTokenDeploymentConfig>> = {
  [PaymentToken.USDC]: {
    metadata: {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    tokenAddress: 'DzhqAQ2C4X3TkvChkdKRo9LqoVVtqTbm4y7WsbxqP6Y9',
    dataFeed: {
      mode: 'switchboard',
      minPrice: '0.1',
      maxPrice: '100000',
      maxStaleness: 86400,
      switchboard: {
        env: 'devnet',
        ethRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
        ethDataFeed: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847', // sepolia address for USDC/USD
        feedName: 'USDC/USD',
      },
    },
  },
};
