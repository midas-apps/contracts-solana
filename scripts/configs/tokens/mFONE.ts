import { PaymentToken } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';
import { UNLIMITED } from '@/scripts/constants/pricing';

export const mFONEConfig: TokenConfigWithNetworks = {
  // Shared configuration (same across all networks)
  metadata: {
    name: 'Midas Fasanara ONE',
    symbol: 'mF-ONE',
    decimals: 9,
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mfone-metadata',
  },
  tokenAuthority: {
    seed: 'mfone-token-authority',
  },
  // Network-specific configurations
  networks: {
    devnet: {
      dataFeed: {
        // Oracle tolerance: 0.40%
        mode: 'manual',
        minPrice: '0.1',
        maxPrice: '100000',
        initialPrice: '0.1',
        maxStaleness: 86400,
      },
      minter: {
        instantFee: '0',
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.6', // 60 bps
        minAmount: '1',
        firstMintMinMTokens: '10',
        greenListEnforced: true,
        feeReceiver: 'Cb8XFuoM4ZpsR2HVCobkkios6Kc6yKqjJfQxfVcaFzNK',
        tokensReceiver: '2xdWTTsHGskEsEsinCYXMSPeRUuxzpDJBHQyjwctXwbk',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0',
            allowance: '50000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      redeemer: {
        instantFee: '1', // 100 bps (1%)
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.6', // 60 bps
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '30',
        greenListEnforced: true,
        feeReceiver: 'Cb8XFuoM4ZpsR2HVCobkkios6Kc6yKqjJfQxfVcaFzNK',
        tokensReceiver: '2xdWTTsHGskEsEsinCYXMSPeRUuxzpDJBHQyjwctXwbk',
        requestRedeemer: '2xdWTTsHGskEsEsinCYXMSPeRUuxzpDJBHQyjwctXwbk',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0',
            allowance: '50000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      grantRoles: {
        tokenManagerAddress: '33vVYcpTkv7HyEnkFHQVY1ndUSfHNFHxyG9PBqy2MCwm',
        vaultsManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        oracleManagerAddress: '6wxkz8CZeTRnjzUgysrATE1592amKHSxLWxA8kWrEwgT',
        metadataAuthority: 'HDBbVzHxAP3vHWnJkxxU99GfJr5NaxMZN8jj5oy2RGze',
      },
    },
  },
};
