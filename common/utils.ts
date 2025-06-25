import { AnchorProvider } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { program } from "commander";
import {
  MTokenName,
  MTokenNameEnum,
  PaymentTokenName,
  PaymentTokenNameEnum,
} from "./tokens";
import path from "path";

export type DeployFunction = (
  provider: AnchorProvider,
  payer: Keypair,
  flags: AppFlags
) => Promise<unknown>;

const flags = [
  {
    name: "cluster",
    description: "The cluster to use",
    default: "devnet",
  },
  {
    name: "mToken",
    description: "The mToken to use",
    default: undefined,
  },
  {
    name: "paymentMint",
    description: "The payment mint to use",
    default: undefined,
  },
];

const clusterOptions = ["devnet", "mainnet", "localnet"] as const;

type AppFlags = {
  cluster: (typeof clusterOptions)[number];
  mToken?: string;
  paymentMint?: string;
};

flags.forEach((flag) => {
  program.option(`--${flag.name} <value>`, flag.description, flag.default);
});

const parseFlags = (): AppFlags => {
  // remove script path from argv
  const argv = process.argv.filter((_, index) => index !== 2);

  program.parse(argv);

  const options = program.opts();
  const cluster = options.cluster as (typeof clusterOptions)[number];

  const mToken = options.mToken;
  const paymentMint = options.paymentMint;

  if (!clusterOptions.includes(cluster)) {
    throw new Error(`Invalid cluster: ${cluster}`);
  }

  if (mToken && !isMTokenName(mToken)) {
    throw new Error(`Invalid mToken: ${mToken}`);
  }
  if (paymentMint && !isPaymentTokenName(paymentMint)) {
    throw new Error(`Invalid paymentMint: ${paymentMint}`);
  }

  return {
    cluster,
    mToken,
    paymentMint,
  };
};

export const executeScriptFile = async () => {
  const scriptPath = process.argv[2];
  const scriptPathResolved = path.resolve(scriptPath);
  const { default: run } = await import(scriptPathResolved);
  await executeAnchorScript(run);
};

export const executeAnchorScript = async (scriptFn: DeployFunction) => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const payer = new Keypair((provider.wallet as any).payer._keypair);
  const flags = parseFlags();

  await scriptFn(provider, payer, flags);
};

export const isMTokenName = (name: string): name is MTokenName => {
  return Object.values(MTokenNameEnum).includes(name as MTokenNameEnum);
};

export const isPaymentTokenName = (name: string): name is PaymentTokenName => {
  return Object.values(PaymentTokenNameEnum).includes(
    name as PaymentTokenNameEnum
  );
};

export const getMTokenOrThrow = (flags: AppFlags) => {
  const mToken = flags.mToken;
  if (!mToken) {
    throw new Error("MToken parameter not found");
  }

  return mToken;
};

export const getPaymentMintOrThrow = (flags: AppFlags) => {
  const paymentToken = flags.paymentMint;
  if (!paymentToken) {
    throw new Error("PaymentToken parameter not found");
  }
  if (!isPaymentTokenName(paymentToken)) {
    throw new Error(`Invalid paymentToken: ${paymentToken}`);
  }
  return paymentToken;
};
