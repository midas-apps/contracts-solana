import { PaymentToken } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';
import { UNLIMITED } from '@/scripts/constants/pricing';

export const solStockMarketTRBasisTradeConfig: TokenConfigWithNetworks = {
  metadata: {
    name: 'Morini StockMarketTRBasisTrade Solana Vault',
    symbol: 'solStockMarketTRBasisTrade',
    decimals: 9,
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/solstockmarkettrbasistrade-metadata',
  },
  networks: {
    mainnet: {
      dataFeed: {
        // Oracle tolerance: 0.36% around the initial 1:1 denomination.
        mode: 'manual',
        minPrice: '0.9964',
        maxPrice: '1.0036',
        initialPrice: '1',
        maxStaleness: 2592000,
      },
      minter: {
        instantFee: '0',
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.5',
        minAmount: '1',
        firstMintMinMTokens: '0',
        greenListEnforced: false,
        feeReceiver: '8LRViwZomu7T2YWRRYApvycuPhHwmw1sWhJAAwXqZTE7',
        tokensReceiver: 'Aukjq3dAYgvQLpq5tC3PrEcCQF1RqTzDxdx8okHyKEyb',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0',
            allowance: '100000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      redeemer: {
        instantFee: '0.5',
        instantDailyLimit: '1000000',
        variationTolerance: '0.5',
        minAmount: '1',
        minFiatRedeemAmount: '1',
        fiatFlatFee: '30',
        greenListEnforced: false,
        feeReceiver: 'Aukjq3dAYgvQLpq5tC3PrEcCQF1RqTzDxdx8okHyKEyb',
        tokensReceiver: 'Aukjq3dAYgvQLpq5tC3PrEcCQF1RqTzDxdx8okHyKEyb',
        requestRedeemer: 'CAq7yoFDkguComm7d5rKGBnajahYcTHPEQWe8q3Xeqrw',
        paymentTokens: [
          {
            symbol: PaymentToken.USDC,
            fee: '0',
            allowance: '100000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      grantRoles: {
        tokenManagerAddress: 'CgKPLTcD9iKQV32k9UWsW6oVhijWqy231qBMPGeyxFQn',
        vaultsManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        oracleManagerAddress: '4teYzKH91exvh2ccrf2UUQk8S5oTZ3CtLTHXSWa1t9fc',
        metadataAuthority: '77F5WP7E9PE3cRbUXGZ8W8S2zvSGvb2WS7QuVGYpavug',
      },
      postDeploy: {
        pauseFunctions: {
          minter: ['depositRequest'],
          redeemer: ['redeemFiatRequest'],
        },
      },
    },
  },
};
