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
    acRoleGlobal: new PublicKey('BW95RL5v9685QqxvuRGjXiM3f6Td9k5QEBiGkXMHwsx1'),
    ac: new PublicKey('5cMcz3NsbJy6AyvGPpMupBXFiQkwC9qRuMxkTPiTb3Qu'),
    tokens: {
      [MProduct.MFONE]: {
        acRole: new PublicKey('2SAaMSzZd9DuNsR3QWNy8mZjNJPnMqdsC4rXz8wgnfFR'),
        mToken: new PublicKey('Ds5juQNpMUwZamY8fbynBrCyBNR8dGnSy2yeFAD3YKRq'),
        tokenAuthority: {
          account: new PublicKey('4ZifxnpKCVVi6tJLktGJC3dZQWvkXtSzkEVNSE4szMsb'),
          seed: 'mfone-token-authority',
        },
        mTokenDataFeed: new PublicKey('NgxLBN1WPPyURFhvvGye8QiMHzWPowNLS6p7TmjuDWH'),
        mTokenUnderlyingFeed: new PublicKey('CYgcgXxnM4CfTrDEuonBVecFK4cacnVaVSyEqWxVxTRH'),
        minter: {
          commonVault: new PublicKey('2Z3UmsZuTs5toGVTMNzsNTZ4JQBxUMWoS5mEsJ9oNXx4'),
          account: new PublicKey('9NDQCb5soUNTfnmGTaiLiWg4FHxR63VnkJNRtVw6m8np'),
        },
        redeemer: {
          commonVault: new PublicKey('ATaeKdaqumC6xT1Byu9m1wYjVatydimux6WrVZdiwJ5z'),
          account: new PublicKey('FncTanaAfZRHUavKYbv2CAURrXXRMBxY9xN8ZAiVwmZT'),
        },
      },
    },
    feeds: {
      [PaymentToken.USDC]: {
        token: new PublicKey('HLLPLxkSJoWmHMtzXWtJHYY87eGybWxSLX5jxatEC1CM'),
        tokenProgram: TOKEN_PROGRAM_ID,
        dataFeed: new PublicKey('DB3b426GZ63vkrmuv21Jr2gZfyuoHSPpfbUhWm1nHugw'),
        underlyingFeed: new PublicKey('Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX'),
      },
      [PaymentToken.USDT]: {
        token: new PublicKey('CDvXCVLE5DHUk4FCYaJjpqNcjL8heCDLezDXE6MKSQoe'),
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
  },
  // Localnet addresses - populated during deployment
  // Programs are deployed to addresses defined in Anchor.toml [programs.localnet]
  // Note: Addresses may change when local validator is reset
  localnet: {},
};
