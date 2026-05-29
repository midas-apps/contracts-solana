import { PaymentToken } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';
import { UNLIMITED } from '@/scripts/constants/pricing';

export const pSVConfig: TokenConfigWithNetworks = {
  // Shared configuration (same across all networks)
  metadata: {
    name: 'Private Strategy Vault',
    symbol: 'pSV',
    decimals: 9,
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/psv-metadata',
  },
  tokenAuthority: {
    seed: 'psv-token-authority',
  },
  // Network-specific configurations
  networks: {
    mainnet: {
      dataFeed: {
        // Oracle tolerance: 1.04%
        mode: 'manual',
        minPrice: '0.99',
        maxPrice: '1.03',
        initialPrice: '1',
        maxStaleness: 2592000,
      },
      minter: {
        instantFee: '0',
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.2', // 20 bps
        minAmount: '0',
        firstMintMinMTokens: '0',
        greenListEnforced: true,
        feeReceiver: 'FCp91ChRdqcwZBp6N5R3ZrxbCMi7mQvvLntFZ27sBdkW',
        tokensReceiver: 'HPdZXFUCcAmbnRh7sYHGWZFvhVhr5eC68vKuNcpo7So7',
        paymentTokens: [
          {
            symbol: PaymentToken.wSOL,
            fee: '0',
            allowance: '10000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      redeemer: {
        instantFee: '0', // 100 bps (1%)
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.2', // 20 bps
        minAmount: '0',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '30',
        greenListEnforced: true,
        feeReceiver: '2rpnUduUCHRB9gCr3zmDQFgr5KSReLiN56QjNJ82D7vv',
        tokensReceiver: 'HPdZXFUCcAmbnRh7sYHGWZFvhVhr5eC68vKuNcpo7So7',
        requestRedeemer: '3DAz5Sdwaofm2FtM3bFSGdwihgmmwn4YhPNWLcXQ5BRc',
        paymentTokens: [
          {
            symbol: PaymentToken.wSOL,
            fee: '0',
            allowance: '10000000',
            stable: true,
            isFiat: false,
          },
        ],
      },
      grantRoles: {
        tokenManagerAddress: '4qeuVmTwFRo1ZF7eVQXZNDNVFT33eav6KNP9xjSKQmZB',
        vaultsManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        oracleManagerAddress: '28pe6ahpsFAo5DConqyw46Z1qAKtMNcqSKQ6iwwBYBcD',
        metadataAuthority: '77F5WP7E9PE3cRbUXGZ8W8S2zvSGvb2WS7QuVGYpavug',
      },
      postDeploy: {
        pauseFunctions: {
          redeemer: ['redeemFiatRequest'],
          minter: ['depositRequest'],
        },
      },
    },
  },
};
