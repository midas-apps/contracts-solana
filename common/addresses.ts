import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

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
};

export const addresses: Record<string, NetworkAddresses> = {
  devnet: {
    feeds: {
      usdc: {
        dataFeed: new PublicKey("Hj8C7ZG8XxpmpivtQ2GzKcgAxgy8MX58krNWCmYYLLcF"),
        token: new PublicKey("FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e"),
        underlyingFeed: new PublicKey(
          "DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb"
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
    acRoleGlobal: new PublicKey("2XbEsVBKUPfs74jEHKXgChgpTp7jLWyXDQG26Tbe3NWt"),
    ac: new PublicKey("3UgrPzUH33EaVkW1Xvw4pw9FnrptzzELnvCfLLPGZq2y"),
    mTBILL: {
      acRole: new PublicKey("7eKVoZusavoMKDnmEPiXTZekAhDBhEXAhqPw3xfw28Ai"),
      mTokenDataFeed: new PublicKey(
        "86Xest1Zo3ZJ8NNfyGJvD62nFw7gUPg7jAZVkBNSbCEw"
      ),
      tokenAuthority: {
        account: new PublicKey("Bb6qPwVHuKxkx2U1TbbfXJTwXjKJPfrbvombSEt1mYLm"),
        seed: "mtbill-token-authority",
      },
      mToken: new PublicKey("7MnCPtnhcyNNsKJnZhu9joyEiQCGLBLYULsrXXiUxxWG"),
      minter: {
        commonVault: new PublicKey(
          "BpFdNp11K2ZwLqV2ABymGnQcnRqakzB6sZnJvGp54q32"
        ),
        account: new PublicKey("DLgLmWSPwAppbfzG8nT82VwqoymwyMBckPB9kqdNcNe9"),
      },
      redeemer: {
        commonVault: new PublicKey(
          "Fx9UQYKPhxZzd6nQx4AhHvPN8SoYrsrPegUYsfqrE9dp"
        ),
        account: new PublicKey("HN4n1gHRP2vwe3hv9C7GBkX2cE1CCHQSGQqmRaJ4uhMq"),
      },
    },
  },
};
