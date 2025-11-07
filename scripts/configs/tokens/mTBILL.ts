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
      },
      redeemer: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '1',
        greenListEnforced: false,
      },
      // Optional: Payment tokens configuration
      // Uncomment and configure when adding payment tokens
      // Note: Mint and feed addresses must exist in common/addresses.ts for the target network
      // paymentTokens: [
      //   {
      //     symbol: "USDC",
      //     mint: "...", // USDC mint address for devnet
      //     feed: "...", // Data feed address from common/addresses.ts
      //     fee: "0.1", // 0.1% fee
      //     allowance: "1000000", // Max allowance
      //     stable: true, // Uses 1:1 rate (stablecoin)
      //     isFiat: false,
      //     tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Optional, defaults to TOKEN_PROGRAM_ID
      //   },
      // ],
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
      },
      redeemer: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '1',
        greenListEnforced: false,
      },
    },
  },
};
