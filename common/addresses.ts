import { DataFeedMode } from "@/test/helpers/data-feed.helpers";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MTokenName } from "./tokens";

export type NetworkAddresses = {
  acRoleGlobal: PublicKey;
  ac: PublicKey;
  tokenAddresses: Partial<Record<MTokenName, TokenAddresses>>;
  feeds?: Record<string, DataFeed>;
};

export type UnderlyingFeed = {
  mode: keyof typeof DataFeedMode;
  pubkey: PublicKey;
};

export type DataFeed = {
  token?: PublicKey;
  tokenProgram?: PublicKey;
  dataFeed?: PublicKey;
  underlyingFeed?: UnderlyingFeed;
};

export type TokenAddresses = {
  acRole?: PublicKey;
  mTokenDataFeed?: {
    pubkey: PublicKey;
    underlyingFeed?: UnderlyingFeed;
  };
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
};

export type Cluster = "devnet" | "mainnet" | "localnet";

export const addresses: Partial<Record<Cluster, NetworkAddresses>> = {
  devnet: {
    feeds: {
      usdc: {
        dataFeed: new PublicKey("Hj8C7ZG8XxpmpivtQ2GzKcgAxgy8MX58krNWCmYYLLcF"),
        token: new PublicKey("FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e"),
        underlyingFeed: {
          // TODO: change to actual mode
          mode: "manual",
          // TODO: change to actual pubkey
          pubkey: new PublicKey("DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb"),
        },
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
    acRoleGlobal: new PublicKey("2XbEsVBKUPfs74jEHKXgChgpTp7jLWyXDQG26Tbe3NWt"),
    ac: new PublicKey("3UgrPzUH33EaVkW1Xvw4pw9FnrptzzELnvCfLLPGZq2y"),
    tokenAddresses: {
      mTBILL: {
        acRole: new PublicKey("7eKVoZusavoMKDnmEPiXTZekAhDBhEXAhqPw3xfw28Ai"),
        mTokenDataFeed: {
          pubkey: new PublicKey("86Xest1Zo3ZJ8NNfyGJvD62nFw7gUPg7jAZVkBNSbCEw"),
          underlyingFeed: {
            // TODO: change to actual mode
            mode: "manual",
            // TODO: change to actual pubkey
            pubkey: new PublicKey(
              "DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb"
            ),
          },
        },
        tokenAuthority: {
          account: new PublicKey(
            "Bb6qPwVHuKxkx2U1TbbfXJTwXjKJPfrbvombSEt1mYLm"
          ),
          seed: "mtbill-token-authority",
        },
        mToken: new PublicKey("7MnCPtnhcyNNsKJnZhu9joyEiQCGLBLYULsrXXiUxxWG"),
        minter: {
          commonVault: new PublicKey(
            "2XKR94FbetbtVAg94KPSrXCXAh7vZP9mSfwiRkioPovN"
          ),
          account: new PublicKey(
            "CbCHN1eEmuH5z7MqsJ3bUHQsJrKawrGeLyNxbNRjWNJw"
          ),
        },
        redeemer: {
          commonVault: new PublicKey(
            "2Gn5LQEyLruiUjJrqtSKAtFTzoRdnjDSmdM2fFMFxTNU"
          ),
          account: new PublicKey(
            "HQAtnBuJndvEj2N5HhETc55hrzC2yTKhSkMGj7URz8SZ"
          ),
        },
      },
    },
  },
};
