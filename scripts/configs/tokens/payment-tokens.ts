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
      mainnet: {
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        dataFeed: {
          mode: 'pyth',
          pyth: {
            // Pyth USDC/USD price feed on Solana mainnet
            // Price feed ID: eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
            // Source: https://docs.pyth.network/price-feeds/core/push-feeds/solana
            underlyingFeed: 'Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX',
          },
          minPrice: '0.997',
          maxPrice: '1.003',
          maxStaleness: 300, // Pyth max staleness is 5 minutes (300 seconds)
        },
      },
      devnet: {
        tokenAddress: 'HLLPLxkSJoWmHMtzXWtJHYY87eGybWxSLX5jxatEC1CM',
        dataFeed: {
          mode: 'pyth',
          pyth: {
            // Pyth USDC/USD price feed on Solana devnet
            // Price feed ID: eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
            // Source: https://docs.pyth.network/price-feeds/core/push-feeds/solana
            underlyingFeed: 'Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX',
          },
          minPrice: '0.997',
          maxPrice: '1.003',
          maxStaleness: 300,
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
  [PaymentToken.wSOL]: {
    metadata: {
      name: 'Wrapped SOL',
      symbol: 'wSOL',
      decimals: 9,
    },
    networks: {
      mainnet: {
        tokenAddress: 'So11111111111111111111111111111111111111112',
        dataFeed: {
          mode: 'manual',
          manual: {
            initialPrice: '1',
            maxAnswerDeviation: '0',
          },
          maxPrice: '1.00',
          minPrice: '0.9999',
          maxStaleness: 365 * 86400,
        },
      },
    },
  },
};
