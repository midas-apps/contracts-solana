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
    acRoleGlobal: new PublicKey('EKVRCL1aKNihZEE5C84pQYawCm1MJoYstCm7nZFpu9Ni'),
    ac: new PublicKey('73yvDiiAL28ECLtTAbykfdRZPGD39edaSK2wdUJZGBPS'),
    tokens: {
      [MProduct.MTBILL]: {
        acRole: new PublicKey('ELxiJNPWqLGVxcweFL2tF4HBxdRhGWye7hnNnvK8fDhd'),
        mToken: new PublicKey('GetHx2gU7Vic2MqSHX2mXzLuz7VLFAdCJ9h9rWkLLMZz'),
        tokenAuthority: {
          account: new PublicKey('7MBptg8vBUprgYstb4wF1UduVbjUcD1JMdS8o5CkAgiT'),
          seed: 'mtbill-token-authority',
        },
        mTokenDataFeed: new PublicKey('2QQwZYBAc7a5oeuJ3MPV6etPoXvMVpAE19wEqcmx1oVC'),
        minter: {
          commonVault: new PublicKey('Bc9zCGi7SvwFbU2RxV3Wz7VXfHLgZnBGeK7TA3TkjWjS'),
          account: new PublicKey('Cuk9r4jXrVxy5jLVzYpNYr5mnL7pWQo3kHUC7EDoPGuT'),
        },
        redeemer: {
          commonVault: new PublicKey('FrLUaM6Fje675yMeArTLZVqpsEixEGVSULGDWpM3gSnf'),
          account: new PublicKey('J8oYYsvgARumvrDPaWXbbgNCsHh8Ucbqgt3meSs6E9i5'),
        },
      },
    },
  },
};
