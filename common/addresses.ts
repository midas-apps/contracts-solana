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
    acRoleGlobal: new PublicKey('2XbEsVBKUPfs74jEHKXgChgpTp7jLWyXDQG26Tbe3NWt'),
    ac: new PublicKey('3UgrPzUH33EaVkW1Xvw4pw9FnrptzzELnvCfLLPGZq2y'),
    tokens: {
      [MProduct.MTBILL]: {
        acRole: new PublicKey('7eKVoZusavoMKDnmEPiXTZekAhDBhEXAhqPw3xfw28Ai'),
        mToken: new PublicKey('7MnCPtnhcyNNsKJnZhu9joyEiQCGLBLYULsrXXiUxxWG'),
        tokenAuthority: {
          account: new PublicKey('Bb6qPwVHuKxkx2U1TbbfXJTwXjKJPfrbvombSEt1mYLm'),
          seed: 'mtbill-token-authority',
        },
        mTokenDataFeed: new PublicKey('86Xest1Zo3ZJ8NNfyGJvD62nFw7gUPg7jAZVkBNSbCEw'),
        minter: {
          commonVault: new PublicKey('2XKR94FbetbtVAg94KPSrXCXAh7vZP9mSfwiRkioPovN'),
          account: new PublicKey('CbCHN1eEmuH5z7MqsJ3bUHQsJrKawrGeLyNxbNRjWNJw'),
        },
        redeemer: {
          commonVault: new PublicKey('2Gn5LQEyLruiUjJrqtSKAtFTzoRdnjDSmdM2fFMFxTNU'),
          account: new PublicKey('HQAtnBuJndvEj2N5HhETc55hrzC2yTKhSkMGj7URz8SZ'),
        },
      },
    },
    feeds: {
      [PaymentToken.USDC]: {
        token: new PublicKey('FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e'),
        tokenProgram: TOKEN_PROGRAM_ID,
        dataFeed: new PublicKey('Hj8C7ZG8XxpmpivtQ2GzKcgAxgy8MX58krNWCmYYLLcF'),
        underlyingFeed: new PublicKey('DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb'),
      },
    },
  },
  // Localnet addresses - populated during deployment
  // Programs are deployed to addresses defined in Anchor.toml [programs.localnet]
  // Note: Addresses may change when local validator is reset
  localnet: {
    acRoleGlobal: new PublicKey('5hNx9o1mKbwEK87gqeRT1bah4f3K1smvBfAfY1d2uAGs'),
    ac: new PublicKey('2d5AR4UKfCiKhhtUXTZT51Ym3LLBNHaqbes1zSFXQKRk'),
    tokens: {
      [MProduct.MTBILL]: {
        acRole: new PublicKey('J2nWcztC7dEqdwHACKnRgKZdLdJwAVQYHy6eNrGsEXgh'),
        mToken: new PublicKey('6wPSPGv5ur55n2BZVoroDvAVANxuEK62BXfCYQWiewaQ'),
        tokenAuthority: {
          account: new PublicKey('7MBptg8vBUprgYstb4wF1UduVbjUcD1JMdS8o5CkAgiT'),
          seed: 'mtbill-token-authority',
        },
        mTokenDataFeed: new PublicKey('3rxccdZzpW7vrt8ixAPeg5XJtN8552mhAk8xsNWh3Pu6'),
        minter: {
          commonVault: new PublicKey('GmdzEQyMf3KBGe2hRkad87JTzNXq7kcxjh4Qq7ESQWMg'),
          account: new PublicKey('CqoxmgZhmzmNk36aXKtS7XKayasthaiqPKVTVMoZHB6o'),
        },
        redeemer: {
          commonVault: new PublicKey('HrFXRth9raunK6q9UadN6WiKkyfsiQv1pfrMETEuCmMy'),
          account: new PublicKey('CFWo7cqvbwAZ7cAcXGwh1rcNBXe3kg8vVQLfGUVwKtKC'),
        },
      },
    },
  },
};

// Helper function to get token addresses
export function getTokenAddresses(
  network: string,
  tokenSymbol: MProduct,
): TokenAddresses | undefined {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return undefined;

  if (networkAddrs.tokens?.[tokenSymbol]) {
    return networkAddrs.tokens[tokenSymbol];
  }

  return undefined;
}
