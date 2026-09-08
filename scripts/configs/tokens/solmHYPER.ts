import { PaymentToken } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';
import { UNLIMITED } from '@/scripts/constants/pricing';

export const solmHYPERConfig: TokenConfigWithNetworks = {
  metadata: {
    name: 'Midas Hyperithm',
    symbol: 'solmHYPER',
    decimals: 9,
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/solmhyper-metadata',
  },
  tokenAuthority: {
    seed: 'mhyper-token-authority',
  },
  networks: {
    mainnet: {
      dataFeed: {
        // Oracle tolerance: 0.35% around the initial 1:1 denomination.
        mode: 'manual',
        manual: {
          initialPrice: '1',
          maxAnswerDeviation: '0.35',
        },
        minPrice: '0.9965',
        maxPrice: '1.0035',
        maxStaleness: 2592000,
      },
      minter: {
        instantFee: '0',
        instantDailyLimit: UNLIMITED,
        variationTolerance: '0.65',
        minAmount: '1',
        firstMintMinMTokens: '1',
        greenListEnforced: false,
        feeReceiver: 'BdRtzrbNTat4N5bS7uUyv9TyCR3JTekyWPWVfLAMgfJb',
        tokensReceiver: 'ASScY5GoicMnBwrbHuaAbHiKJZV9KrkkHHpQ8yr9DWKP',
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
        variationTolerance: '0.65',
        minAmount: '1',
        minFiatRedeemAmount: '1',
        fiatFlatFee: '30',
        greenListEnforced: false,
        feeReceiver: '4p7hyyDSyDNimujjeQPq64GG5xKR2Se1AQrWQ2WJadmB',
        tokensReceiver: 'ASScY5GoicMnBwrbHuaAbHiKJZV9KrkkHHpQ8yr9DWKP',
        requestRedeemer: '5ohhFwvu6JKjrmVew1bxLyAGtyazNp8LoiiG6W5j3tti',
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
        tokenManagerAddress: '3ZS77iWMnaKUt7S4qUXSqD7uie6F5Zuq7YSzD7DYNK7e',
        vaultsManagerAddress: 'QRLkMrM5jfEmS6kmBBEgfDo97VariSWiuoCn1WkmBpj',
        oracleManagerAddress: 'AUUpjEouPGzYQ7Fmoak3ohdXmL2n6jtNb1AjW8y8rQSk',
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
