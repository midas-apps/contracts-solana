import { Idl, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createApproveInstruction,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import {
  AddedAccount,
  Clock,
  ProgramTestContext,
  startAnchor,
} from "solana-bankrun";

import { BankrunProvider } from "anchor-bankrun";
import {
  parseUnits as parseUnitsViem,
  formatUnits as formatUnitsViem,
} from "viem";
import { ZERO_ADDRESS } from "../constants/common.constants";
import { DataFeed } from "@/target/types/data_feed";
import { MidasVaults } from "@/target/types/midas_vaults";
// import { ZERO_ADDRESS } from "test/constants/common.constants";

export type OptionalCommonParams = {
  from?: Keypair;
  revertedWith?: {
    message?: string;
  };
};

export type DataFeedProgram = Program<DataFeed>;
export type VaultsProgram = Program<MidasVaults>;

export function numToHex(decimalCode: number): string {
  const hexCode = `0x${decimalCode.toString(16).toUpperCase()}`;

  return hexCode;
}

export const initBankrun = async (numAccounts: number = 10) => {
  const accounts: Keypair[] = [];

  const accountsToInject: AddedAccount[] = [];

  for (let i = 0; i < numAccounts; i++) {
    const keypair = Keypair.generate();
    accounts.push(keypair);

    accountsToInject.push({
      address: keypair.publicKey,
      info: {
        lamports: 1000 * LAMPORTS_PER_SOL,
        data: Buffer.alloc(0),
        owner: SystemProgram.programId,
        executable: false,
      },
    });
  }

  const context = await startAnchor(".", [], [...accountsToInject]);
  const provider = new BankrunProvider(context);

  anchor.setProvider(provider);

  return {
    context,
    provider,
    accounts,
  };
};

export const fromBN = (bn?: BN) => {
  return BigInt((bn ?? 0).toString());
};

export const toBN = (n: number | string | bigint) => {
  return new BN(n.toString());
};

export const findPDA = <TProgram extends Idl | unknown>(
  seeds: Array<string | Buffer | PublicKey | BN>,
  program: TProgram extends Idl ? Program<TProgram> : PublicKey
) => {
  const programId = (program as Program).programId || (program as PublicKey);

  return PublicKey.findProgramAddressSync(
    [
      ...seeds.map((v) =>
        Buffer.from((v as PublicKey)?.toBuffer?.() ?? (v as string | Buffer))
      ),
    ],
    programId
  );
};

export const expectReverted = async (
  promise: Promise<unknown>,
  opt?: OptionalCommonParams
) => {
  try {
    await promise;
    throw new Error("Expected to be reverted but not reverted");
  } catch (err) {
    if (
      opt?.revertedWith?.message &&
      !err.toString().includes(opt.revertedWith.message)
    ) {
      throw new Error(
        `Expected tx to revert with message ${
          opt.revertedWith.message
        }. Err: ${err.toString()}`
      );
    }
  }
};

export const expectTxReverted = async (
  ctx: ProgramTestContext,
  transaction: Transaction,
  signers: (Keypair | Signer)[],
  opt?: OptionalCommonParams
) => {
  try {
    await processTransaction(ctx, transaction, signers);
    throw new Error("Expected to be reverted but not reverted");
  } catch (err) {
    if (
      opt?.revertedWith?.message &&
      !err.toString().includes(opt.revertedWith.message)
    ) {
      throw new Error(
        `Expected tx to revert with message ${
          opt.revertedWith.message
        }. Err: ${err.toString()}`
      );
    }
  }
};

export const expectNotReverted = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    expect(
      true,
      `Expected tx to not revert, but it reverted. Err: ${err.toString()}`
    ).toEqual(false);
  }
};

export const expectTxNotReverted = async (
  ctx: ProgramTestContext,
  transaction: Transaction,
  signers: (Keypair | Signer)[]
) => {
  try {
    await processTransaction(ctx, transaction, signers);
  } catch (err) {
    expect(
      true,
      `Expected tx to not revert, but it reverted. Err: ${err.toString()}`
    ).toEqual(false);
  }
};

let latestSlot = 1;
export const processTransaction = async (
  ctx: ProgramTestContext,
  transaction: Transaction,
  signers: (Keypair | Signer)[]
) => {
  // Need to generate new blockhash
  ctx.warpToSlot(BigInt(latestSlot + 1));
  latestSlot++;

  const blockHash = ctx.lastBlockhash;
  const client = ctx.banksClient;

  transaction.recentBlockhash = blockHash;
  transaction.sign(...signers);

  await client.processTransaction(transaction);
};

export const parseUnits = (n: string, decimals = 9) => {
  return parseUnitsViem(n, decimals);
};

export const formatUnits = (n: bigint, decimals = 9) => {
  return +formatUnitsViem(n, decimals);
};

export const createMint = async (
  connection: Connection,
  ctx: ProgramTestContext,
  payer: Signer,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number,
  keypair = Keypair.generate(),
  programId = TOKEN_PROGRAM_ID
) => {
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId,
    }),
    createInitializeMint2Instruction(
      keypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      programId
    )
  );

  await processTransaction(ctx, transaction, [payer, keypair]);

  return keypair.publicKey;
};

export const approveMintInstruction = (
  mint: PublicKey,
  payer: Signer,
  approveTo: PublicKey,
  amount: bigint,
  programId = TOKEN_PROGRAM_ID
) => {
  return createApproveInstruction(
    findATA(mint, payer.publicKey, programId),
    approveTo,
    payer.publicKey,
    amount,
    undefined,
    programId
  );
};

export const approveMint = async (
  ctx: ProgramTestContext,
  mint: PublicKey,
  payer: Signer,
  approveTo: PublicKey,
  amount: bigint,
  programId = TOKEN_PROGRAM_ID
) => {
  await processTransaction(
    ctx,
    new Transaction().add(
      approveMintInstruction(mint, payer, approveTo, amount, programId)
    ),
    [payer]
  );
};

export const getOrCreateAta = async (
  context: ProgramTestContext,
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  signer: Keypair,
  program = TOKEN_PROGRAM_ID
) => {
  const ata = getAssociatedTokenAddressSync(mint, owner, true, program);
  try {
    const ataAccount = await getAccount(connection, ata, undefined, program);

    return {
      ataAccount,
      ata,
    };
  } catch (e: any) {
    if (
      e instanceof TokenAccountNotFoundError ||
      e instanceof TokenInvalidAccountOwnerError ||
      e?.message?.includes("Could not find")
    ) {
      const ix = new Transaction().add(
        createAtaInx(signer.publicKey, ata, mint, owner, program)
      );

      await processTransaction(context, ix, [signer]);

      const ataAccount = await getAccount(connection, ata, undefined, program);
      const newAta = findATA(mint, owner, program);

      return {
        ataAccount,
        ata: newAta,
      };
    }

    throw e;
  }
};

export const findATA = (
  token: PublicKey,
  address: PublicKey,
  program = TOKEN_PROGRAM_ID
): PublicKey => {
  return getAssociatedTokenAddressSync(token, address, true, program);
};

export function createAtaInx(
  payer: PublicKey,
  ataAccount: PublicKey,
  mint: PublicKey,
  owner = payer,
  program = TOKEN_PROGRAM_ID
) {
  return createAssociatedTokenAccountInstruction(
    payer,
    ataAccount,
    owner,
    mint,
    program
  );
}

export const timeTravel = async (
  ctx: ProgramTestContext,
  timestamp: bigint
) => {
  const client = ctx.banksClient;
  const currentClock = await client.getClock();
  ctx.setClock(
    new Clock(
      currentClock.slot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      timestamp
    )
  );
};

export const getTime = async (ctx: ProgramTestContext) => {
  const client = ctx.banksClient;
  return (await client.getClock()).unixTimestamp;
};

export const getBalance = async (
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey = ZERO_ADDRESS,
  programId = TOKEN_PROGRAM_ID
) => {
  if (mint.equals(ZERO_ADDRESS)) {
    return connection.getBalance(owner).then((v) => BigInt(v));
  } else {
    const ata = getAssociatedTokenAddressSync(mint, owner, true, programId);
    const balance = await getAccount(connection, ata, undefined, programId)
      .then((v) => v.amount)
      .catch((err) => {
        if (err instanceof TokenAccountNotFoundError) {
          return 0n;
        }
        throw err;
      });

    return balance;
  }
};
