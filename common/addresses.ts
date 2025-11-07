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
  mTokenDataFeed?: PublicKey;
  mToken?: PublicKey;
  tokenAuthority?: {
    seed: string;
    account: PublicKey;
  };
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
    feeds: {
      [PaymentToken.USDC]: {
        dataFeed: new PublicKey('Hj8C7ZG8XxpmpivtQ2GzKcgAxgy8MX58krNWCmYYLLcF'),
        token: new PublicKey('FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e'),
        underlyingFeed: new PublicKey('DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb'),
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
    acRoleGlobal: new PublicKey('2XbEsVBKUPfs74jEHKXgChgpTp7jLWyXDQG26Tbe3NWt'),
    ac: new PublicKey('3UgrPzUH33EaVkW1Xvw4pw9FnrptzzELnvCfLLPGZq2y'),
    tokens: {
      [MProduct.MTBILL]: {
        acRole: new PublicKey('7eKVoZusavoMKDnmEPiXTZekAhDBhEXAhqPw3xfw28Ai'),
        mTokenDataFeed: new PublicKey('86Xest1Zo3ZJ8NNfyGJvD62nFw7gUPg7jAZVkBNSbCEw'),
        tokenAuthority: {
          account: new PublicKey('Bb6qPwVHuKxkx2U1TbbfXJTwXjKJPfrbvombSEt1mYLm'),
          seed: 'mtbill-token-authority',
        },
        mToken: new PublicKey('7MnCPtnhcyNNsKJnZhu9joyEiQCGLBLYULsrXXiUxxWG'),
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
  },
  // Localnet addresses - initialized empty, will be populated during deployment
  // Programs are deployed to addresses defined in Anchor.toml [programs.localnet]
  // AC and AC Role Global will be automatically deployed on first token deployment
  localnet: {
    tokens: {} as Partial<Record<MProduct, TokenAddresses>>,
    feeds: {} as Partial<Record<PaymentToken, DataFeed>>,
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
