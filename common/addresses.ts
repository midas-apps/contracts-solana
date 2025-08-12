import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { Network } from './types';
import { MTokenName } from './types/tokens';

export type RedemptionVaultType =
  | 'redemptionVault'
  | 'redemptionVaultBuidl'
  | 'redemptionVaultSwapper'
  | 'redemptionVaultUstb';

export type VaultType = RedemptionVaultType | 'depositVault';

export type NetworkAddresses = {
  acRoleGlobal: PublicKey;
  ac: PublicKey;
  mTBILL?: TokenAddresses;
  feeds?: Record<string, DataFeed>;
};

export type DataFeed = {
  token?: PublicKey;
  tokenProgram?: PublicKey;
  dataFeed?: PublicKey;
  underlyingFeed?: PublicKey;
};

export type TokenAddresses = {
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
  tokenProgram?: PublicKey;
};

export const addresses: Record<Network, NetworkAddresses> = {
  devnet: {
    feeds: {
      usdc: {
        dataFeed: new PublicKey('Hj8C7ZG8XxpmpivtQ2GzKcgAxgy8MX58krNWCmYYLLcF'),
        token: new PublicKey('FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e'),
        underlyingFeed: new PublicKey(
          'DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb',
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      mTBILL: {
        underlyingFeed: new PublicKey(
          '5GjQDcVcPwwMAzT6ZUjXgeVgRVM4UTvbpYieiBKuQi7f',
        ),
      },
    },
    acRoleGlobal: new PublicKey('2XbEsVBKUPfs74jEHKXgChgpTp7jLWyXDQG26Tbe3NWt'),
    ac: new PublicKey('3UgrPzUH33EaVkW1Xvw4pw9FnrptzzELnvCfLLPGZq2y'),
    mTBILL: {
      acRole: new PublicKey('7eKVoZusavoMKDnmEPiXTZekAhDBhEXAhqPw3xfw28Ai'),
      mTokenDataFeed: new PublicKey(
        '86Xest1Zo3ZJ8NNfyGJvD62nFw7gUPg7jAZVkBNSbCEw',
      ),
      tokenAuthority: {
        account: new PublicKey('Bb6qPwVHuKxkx2U1TbbfXJTwXjKJPfrbvombSEt1mYLm'),
        seed: 'mtbill-token-authority',
      },
      mToken: new PublicKey('7MnCPtnhcyNNsKJnZhu9joyEiQCGLBLYULsrXXiUxxWG'),
      minter: {
        commonVault: new PublicKey(
          '2XKR94FbetbtVAg94KPSrXCXAh7vZP9mSfwiRkioPovN',
        ),
        account: new PublicKey('CbCHN1eEmuH5z7MqsJ3bUHQsJrKawrGeLyNxbNRjWNJw'),
      },
      redeemer: {
        commonVault: new PublicKey(
          '2Gn5LQEyLruiUjJrqtSKAtFTzoRdnjDSmdM2fFMFxTNU',
        ),
        account: new PublicKey('HQAtnBuJndvEj2N5HhETc55hrzC2yTKhSkMGj7URz8SZ'),
      },
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  },
  mainnet: undefined,
};

export const getAddresses = (network: Network): NetworkAddresses => {
  const networkAddresses = addresses[network];
  if (!networkAddresses) {
    throw new Error(`Addresses for network ${network} not found`);
  }
  return networkAddresses;
};

export const getTokenAddresses = (
  network: Network,
  token: MTokenName,
): TokenAddresses => {
  const addresses = getAddresses(network);
  if (!addresses[token]) {
    throw new Error(`Token addresses for token ${token} not found`);
  }
  return addresses[token];
};
