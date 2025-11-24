import { PaymentToken } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';
import { PLACEHOLDER_FEED_ADDRESS } from '@/scripts/utils/feedUtils';

export const mTBILLConfig: TokenConfigWithNetworks = {
  // Shared configuration (same across all networks)
  metadata: {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
    decimals: 9,
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mtbill-metadata',
  },
  tokenAuthority: {
    seed: 'mtbill-token-authority',
  },
  // Network-specific configurations
  networks: {
    devnet: {
      dataFeed: {
        mode: 'switchboard',
        minPrice: '0.1',
        maxPrice: '100000',
        maxStaleness: 86400,
        switchboard: {
          env: 'devnet',
          ethRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
          ethDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
          feedName: 'mTBILL/USD',
        },
      },
      minter: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        firstMintMinMTokens: '10',
        greenListEnforced: false,
        feeReceiver: 'EfzamqVaGeuo2bVDJUophcChKD65tC52vQzSyrEEP3Fk',
        tokensReceiver: 'EfzamqVaGeuo2bVDJUophcChKD65tC52vQzSyrEEP3Fk',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0.1',
            allowance: '1000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      redeemer: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '1',
        greenListEnforced: false,
        feeReceiver: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        tokensReceiver: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        requestRedeemer: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0.1',
            allowance: '1000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      grantRoles: {
        tokenManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        vaultsManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        oracleManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
      },
    },
    localnet: {
      dataFeed: {
        mode: 'manual',
        minPrice: '0.1',
        maxPrice: '100000',
        maxStaleness: 86400,
        underlyingFeed: PLACEHOLDER_FEED_ADDRESS, // Placeholder - will be set during deployment
      },
      minter: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        firstMintMinMTokens: '10',
        greenListEnforced: false,
        feeReceiver: '7KfnBgNZRuQwNruHMpBpBMtu9B9Rjw4SNux3iQvsCESg',
        tokensReceiver: '7KfnBgNZRuQwNruHMpBpBMtu9B9Rjw4SNux3iQvsCESg',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0.1',
            allowance: '1000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      redeemer: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '1',
        greenListEnforced: false,
        feeReceiver: '7KfnBgNZRuQwNruHMpBpBMtu9B9Rjw4SNux3iQvsCESg',
        tokensReceiver: '7KfnBgNZRuQwNruHMpBpBMtu9B9Rjw4SNux3iQvsCESg',
        requestRedeemer: '7KfnBgNZRuQwNruHMpBpBMtu9B9Rjw4SNux3iQvsCESg',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0.1',
            allowance: '1000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      grantRoles: {
        tokenManagerAddress: 'APT88pPXe1Ak3jerAoMuWCuXFfhj1LvsRgMpem87xTmW',
        vaultsManagerAddress: '8ZSEKPwQ6Q7WdLbwCnUwynSPpiuikqP6qug2Es4X3x51',
        oracleManagerAddress: 'EqBBuvHDiB5i3G4rbojAX2QgQp1izTW1ET4tGXbDYpA',
      },
    },
  },
};
