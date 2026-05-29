import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { MProduct, PaymentToken } from './tokenTypes';

export interface NetworkAddresses {
  acRoleGlobal?: PublicKey;
  ac?: PublicKey;
  timelock?: TimelockAddresses;
  tokens?: Partial<Record<MProduct, TokenAddresses>>;
  feeds?: Partial<Record<PaymentToken, DataFeed>>;
}

export type TimelockAddresses = {
  multisig: PublicKey;
  vault: PublicKey;
};

export interface DataFeed {
  token?: PublicKey;
  tokenProgram?: PublicKey;
  dataFeed?: PublicKey;
  underlyingFeed?: PublicKey;
}

export interface TokenAddresses {
  acRole?: PublicKey;
  acGlobalOverride?: {
    ac?: PublicKey;
    acRole: PublicKey;
  };
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
    timelock: {
      multisig: new PublicKey('CNM9uFrjXTun2zk6w7FkXKgryURXezBMZJZ4RSh8NLt3'),
      vault: new PublicKey('3XeBT7F1H3cbSETdHvTFDr8Wz47yNZZ6dYZsQJScdm9u'),
    },
    tokens: {
      [MProduct.SOLMFONE]: {
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
  mainnet: {
    acRoleGlobal: new PublicKey('39tDSAtrYuy7cA6ipj1N9c8jzs5kRPbWAj5ztmW3sMa6'),
    ac: new PublicKey('2dGjhqtMhDk1zuhv8NhiTS52fDudaSQt8DHhPbtrit3a'),
    tokens: {
      [MProduct.SOLMFONE]: {
        acRole: new PublicKey('CVUnxqMxQGeUyEn1Pd7DXmZawQMpGruWGLikFe2E7u5k'),
        mToken: new PublicKey('ESS9fuAbDiyDXy6y1ZAt9VSaiGPSqG8NwaWVX7dePdR7'),
        tokenAuthority: {
          account: new PublicKey('4ZifxnpKCVVi6tJLktGJC3dZQWvkXtSzkEVNSE4szMsb'),
          seed: 'mfone-token-authority',
        },
        mTokenDataFeed: new PublicKey('7UVwLrMTEDVvzQRaitJi7YLJcxFY8RTmXrHvSPMjTGDm'),
        mTokenUnderlyingFeed: new PublicKey('HHwwM9t8eEeNDnGpXQnkHth2xHHxkD531qqBqz5H7meX'),
        minter: {
          commonVault: new PublicKey('BzKC2gazYSmB9QE2yUKGZe8K2iedFREYpGZesCHEqRbg'),
          account: new PublicKey('EaXc6FVh6m7R4cEZp1T4h6At95qguP8b8UNFe3pbYoH1'),
        },
        redeemer: {
          commonVault: new PublicKey('Gzu6rgQ6ezGkNYExQ2WZJvV7Y9LidUKSUAjUZWb5v1c2'),
          account: new PublicKey('DNJMfdgrrVHKp1nFY5Qoqq14erqzdJoMve5THgKpCkrb'),
        },
      },
      [MProduct.PSV]: {
        acRole: new PublicKey('77YMLUMHD5Pdq2qvYCjTNL5oP1Z5hKPK4yuak2EaLJya'),
        acGlobalOverride: {
          ac: new PublicKey('6kGJVtfqxi2Jv5Ejb7W8UwWd9yuhckA69u9zjpRnVQiW'),
          acRole: new PublicKey('9LWZYKZdNN6cBFf8Tu2NLUujgqZ2HZQ8ZsYJVUvnuHHr'),
        },
        mToken: new PublicKey('H4hLpHyvjMiDytckLgAhRyTzHAoSYg2eQ9RGTUissayx'),
        tokenAuthority: {
          account: new PublicKey('AEk5FmQYH6uqxsiQRX6yUkyugLd9QVheSsP4eKFhZYyK'),
          seed: 'psv-token-authority',
        },
        mTokenDataFeed: new PublicKey('K5CPdTisCUonoqzjJH2NBiHRY7gU7oPxSS5wymmU78z'),
        mTokenUnderlyingFeed: new PublicKey('3JQuSWEyd8CwcniXWfSWGgzrUQfcsTsgtGHe92pVaTHi'),
        minter: {
          commonVault: new PublicKey('GgmNCBisHT3SQ6aVyabPXyJE6ss8v4s23JFnBXJBzasz'),
          account: new PublicKey('6FqbTK8xSiQPA5BLyzTkR2hjXPNN1jrut8qU333o8hea'),
        },
        redeemer: {
          commonVault: new PublicKey('93Qpf7sfihJr5a6HdZ5N53jqe7ieevxuEmLqdAVBRrK8'),
          account: new PublicKey('DKp86fdtsZMbegJNcxH3ea9eGhahXDWsxaSXCe79MYXZ'),
        },
      },
      [MProduct.SOLMHYPER]: {
        acRole: new PublicKey('66uBL5bq5nXg8SKGUzgCvuQ73HWg1TmnSkEGkHBXVWW'),
        mToken: new PublicKey('2svm1UkdXq5sygCm7gJmUDS7qa9DCshsj8KSVKZimHpp'),
        tokenAuthority: {
          account: new PublicKey('GctLcDKKVWmwaFz4AkCQGdZLoyPVHKkB7MFAXtBrbpnB'),
          seed: 'mhyper-token-authority',
        },
        mTokenDataFeed: new PublicKey('BqhYhduxQ4hMsAh5ysuPjAxpcDTMgGkqoXwpbAXcosjb'),
        mTokenUnderlyingFeed: new PublicKey('8jbaPPDuFzUnSJxTVaU7zWwburP5RDGHfS6nbrb2sEkv'),
        minter: {
          commonVault: new PublicKey('5EWyEBBMUK31KGXjDimVgLfLEjjSrvDDRpXR6oAQJKT3'),
          account: new PublicKey('eR8rty5KUuAQYncdGq5epNmwHm8nXCHzKv6cR3rbDsV'),
        },
        redeemer: {
          commonVault: new PublicKey('GJ23UDbiRTu7foXjWaTimaPdmVT3KFYs8YdVdB5ecFsS'),
          account: new PublicKey('DesvLajywoN5bR8rsGXSgtbmDBwKtxdcpdcMguhqabJo'),
        },
      },
    },
    feeds: {
      [PaymentToken.USDC]: {
        token: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        tokenProgram: TOKEN_PROGRAM_ID,
        dataFeed: new PublicKey('EY9TeqHx3QbKfSbZW7vZPNeg6Y8nwprsa9rm6okGCKpn'),
        underlyingFeed: new PublicKey('Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX'),
      },
      [PaymentToken.wSOL]: {
        token: new PublicKey('So11111111111111111111111111111111111111112'),
        tokenProgram: TOKEN_PROGRAM_ID,
        dataFeed: new PublicKey('3XCjjrbWFkiUmUs1i3MKk9GbXSAGQw7vZAhJb6XH3xCH'),
        underlyingFeed: new PublicKey('H1kJWEqotQcdg2fiMNby1Fhtp44EZnCLFbuvwk7fmTBy'),
      },
    },
  },
};
