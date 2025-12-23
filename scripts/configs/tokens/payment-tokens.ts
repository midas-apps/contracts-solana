import { PaymentToken } from '@/common/tokenTypes';
import { PaymentTokenConfigWithNetworks } from '@/scripts/configs/types';

export const paymentTokenConfigs: Partial<Record<PaymentToken, PaymentTokenConfigWithNetworks>> = {
  [PaymentToken.USDC]: {
    metadata: {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    networks: {
      devnet: {
        tokenAddress: 'DzhqAQ2C4X3TkvChkdKRo9LqoVVtqTbm4y7WsbxqP6Y9',
        dataFeed: {
          mode: 'switchboard',
          minPrice: '0.99',
          maxPrice: '1.01',
          maxStaleness: 86400,
          switchboard: {
            env: 'devnet',
            ethRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
            ethDataFeed: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847', // Sepolia USDC/USD
            feedName: 'USDC/USD',
          },
        },
      },
      localnet: {
        dataFeed: {
          mode: 'manual',
          minPrice: '0.99',
          maxPrice: '1.01',
          maxStaleness: 86400,
        },
      },
    },
  },
};
