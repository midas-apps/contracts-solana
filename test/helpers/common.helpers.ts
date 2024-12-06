import { Idl, Program, web3 } from "@coral-xyz/anchor";
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
  BanksTransactionMeta,
  Clock,
  ProgramTestContext,
  startAnchor,
} from "solana-bankrun";

import { BankrunProvider } from "anchor-bankrun";
import {
  parseUnits as parseUnitsViem,
  formatUnits as formatUnitsViem,
} from "viem";
import { DEFAULT_PUBKEY } from "../constants/common.constants";
import { DataFeed } from "@/target/types/data_feed";
import { MidasVaults } from "@/target/types/midas_vaults";
import { TokenAuthority } from "@/target/types/token_authority";
import { AccessControl } from "@/target/types/access_control";
// import { ZERO_ADDRESS } from "test/constants/common.constants";

export type OptionalCommonParams = {
  from?: Keypair;
  revertedWith?: string | number;
};

export type DataFeedProgram = Program<DataFeed>;
export type VaultsProgram = Program<MidasVaults>;
export type TokenAuthorityProgram = Program<TokenAuthority>;
export type AccessControlProgram = Program<AccessControl>;

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

export const toBNNullable = (n: number | string | bigint | null): BN | null => {
  return n !== null ? new BN(n.toString()) : null;
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

export const expectTxReverted = async (
  ctx: ProgramTestContext,
  transaction: web3.Transaction,
  signers: (Keypair | Signer)[],
  opt?: OptionalCommonParams
) => {
  try {
    await processTransaction(ctx, transaction, signers);
    throw new Error("Expected to be reverted but not reverted");
  } catch (err) {
    const revertMessage =
      opt?.revertedWith && typeof opt.revertedWith === "number"
        ? numToHex(opt.revertedWith as number).toLowerCase()
        : opt.revertedWith?.toString();

    if (revertMessage && !err.toString().includes(revertMessage)) {
      throw new Error(
        `Expected tx to revert with message ${revertMessage}. Err: ${err.toString()}`
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

export const expectEvents = async <TProgram extends Idl>(
  txResult: BanksTransactionMeta | string[],
  program: Program<TProgram>,
  expectedEvents: { name: string; data: Object }[]
) => {
  const parser = new anchor.EventParser(
    program.programId,
    new anchor.BorshCoder(program.idl)
  );

  const logs = Array.isArray(txResult) ? txResult : txResult.logMessages;

  const events = parser.parseLogs(logs);

  const format = (obj: Object) => {
    if (!obj) return obj;

    const formattedData = Object.entries(obj).map(([key, value]) => {
      if (value instanceof PublicKey) {
        return [key, value.toBase58()];
      }

      if (value instanceof BN) {
        return [key, BigInt(value.toString())];
      }

      if (typeof value === "object") {
        return [key, format(value)];
      }

      return [key, value];
    });

    return Object.fromEntries(formattedData);
  };

  for (let expectedEv of expectedEvents) {
    const event = Array.from(events).find((v) => v.name === expectedEv.name);

    if (!event)
      throw new Error(`Expected to emit event ${expectedEv.name} but it wasnt`);

    const expectedEvDataObj = format(expectedEv.data);
    const evDataObj = format(event.data);

    Object.entries(expectedEvDataObj).forEach(([key, value]) => {
      if (!value) return;

      expect(evDataObj).toHaveProperty(key);

      if (typeof value === "object") {
        expect(evDataObj[key]).toMatchObject(value);
      } else {
        expect(evDataObj[key]).toBe(value);
      }
    });
  }
};

export const expectTxNotReverted = async (
  ctx: ProgramTestContext,
  transaction: Transaction,
  signers: (Keypair | Signer)[]
) => {
  try {
    return await processTransaction(ctx, transaction, signers);
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

  return await client.processTransaction(transaction);
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
  tokenAuthority: PublicKey,
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
      tokenAuthority,
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
  timestampDelta: bigint
) => {
  const client = ctx.banksClient;
  const currentClock = await client.getClock();
  ctx.setClock(
    new Clock(
      currentClock.slot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      currentClock.unixTimestamp + timestampDelta
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
  mint: PublicKey | null = DEFAULT_PUBKEY,
  programId = TOKEN_PROGRAM_ID
) => {
  if (mint.equals(DEFAULT_PUBKEY)) {
    return 0n;
  } else if (mint === null) {
    return connection.getBalance(owner).then((v) => BigInt(v));
  } else {
    const ata = getAssociatedTokenAddressSync(mint, owner, true, programId);
    const balance = await getAccount(connection, ata, undefined, programId)
      .then((v) => v.amount)
      .catch((err) => {
        if (
          err instanceof TokenAccountNotFoundError ||
          err?.toString?.()?.includes?.("Could not find")
        ) {
          return 0n;
        }
        throw err;
      });

    return balance;
  }
};

export const parsePercent = (val: number) => {
  return parseUnits(val.toString(), 2);
};
