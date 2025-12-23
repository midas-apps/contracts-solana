import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { MProduct, PaymentToken } from './tokenTypes';

export interface NetworkAddresses {
  acRoleGlobal?: PublicKey;
  ac?: PublicKey;
  tokens?: Partial<Record<MProduct, TokenAddresses>>;
  feeds?: Partial<Record<PaymentToken, DataFeed>>;
}

export interface DataFeed {
  token?: PublicKey;
  tokenProgram?: PublicKey;
  dataFeed?: PublicKey;
  underlyingFeed?: PublicKey;
}

export interface TokenAddresses {
  acRole?: PublicKey;
  mToken?: PublicKey;
  tokenAuthority?: {
    seed: string;
    account: PublicKey;
  };
  mTokenDataFeed?: PublicKey;
  mTokenUnderlyingFeed?: PublicKey;
  minter?: {
    commonVault: PublicKey;
    account: PublicKey;
  };
  redeemer?: {
    commonVault: PublicKey;
    account: PublicKey;
  };
}

export const addresses: Record<string, NetworkAddresses> = {
  devnet: {
    acRoleGlobal: new PublicKey('23u9vEJZMEttKiBppqNzwfMGmBXHqXLyMYUzaYegmHFU'),
    ac: new PublicKey('FzDYrqApor8nB2FVecPHgDa8Fo3n6zFM7VT1QK9fxxqg'),
    tokens: {
      [MProduct.MTBILL]: {
        acRole: new PublicKey('FzrHGtLeFtdXe3wbQwdYkuyF4bRUexQVzpXajR1fFpqm'),
        mToken: new PublicKey('Dq5LudGLxCAf1iCdDQH4uUY6aPf5rChD1RuVDFHArLWP'),
        tokenAuthority: {
          account: new PublicKey('3KFxzsUWDcZQCB9w6wnfNyhJRoQPW66dZyABRTWaSPZU'),
          seed: 'mtbill-token-authority',
        },
        mTokenDataFeed: new PublicKey('6NwoiVNsKHAXstcgGye9kkfF8N5h4jUBPMoRpKXPBA6L'),
        minter: {
          commonVault: new PublicKey('2rsjVWeskM2rwY6xKSoxSN8mLWGmW4hkEjj8gqUpdfiB'),
          account: new PublicKey('AjeCRXLVxwxrk1uxW5XsHN11HqSHtsVvsYmMMP1KzZ3n'),
        },
        redeemer: {
          commonVault: new PublicKey('Dc4yseMgmvgTt5KgbURku4isuZuAAGxAik4KJCcXG99m'),
          account: new PublicKey('FZQbJaThndkckRNhje6m8qSghaUpY9VrDsouLitpfoCD'),
        },
      },
    },
    feeds: {
      [PaymentToken.USDC]: {
        token: new PublicKey('DzhqAQ2C4X3TkvChkdKRo9LqoVVtqTbm4y7WsbxqP6Y9'),
        tokenProgram: TOKEN_PROGRAM_ID,
        dataFeed: new PublicKey('2prq84UfGoqEvkyhqScFk8SqQBu3aReiteLQ1HnGJcA6'),
        underlyingFeed: new PublicKey('CWajqu4CEqyL9HjMXDvo5Rk7EW4uymP9zeKKfexTxVey'),
      },
    },
  },
  // Localnet addresses - populated during deployment
  // Programs are deployed to addresses defined in Anchor.toml [programs.localnet]
  // Note: Addresses may change when local validator is reset
  localnet: {},
};
