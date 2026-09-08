import { Idl, Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import {
  createApproveInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createRevokeInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token';
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  Clock,
  FailedTransactionMetadata,
  LiteSVM,
  SimulatedTransactionInfo,
  TransactionMetadata,
} from 'litesvm';
import { parseUnits as parseUnitsViem, formatUnits as formatUnitsViem } from 'viem';

import { AccessControl } from '@/target/types/access_control';
import { DataFeed } from '@/target/types/data_feed';
import { MidasVaults } from '@/target/types/midas_vaults';
import { TokenAuthority } from '@/target/types/token_authority';

import { DEFAULT_PUBKEY } from '../constants/common.constants';
import { SQUADS_PROGRAM_ID } from '../constants/squads.constant';

import { fromWorkspace, LiteSVMProvider } from './lite-svm';

const TESTS_LOG_LEVEL = (process.env.TESTS_LOG_LEVEL as 'error' | 'debug') || 'error';

export interface OptionalCommonParams {
  from?: Keypair;
  revertedWith?: string | number;
}

export type DataFeedProgram = Program<DataFeed>;
export type VaultsProgram = Program<MidasVaults>;
export type TokenAuthorityProgram = Program<TokenAuthority>;
export type AccessControlProgram = Program<AccessControl>;

export function numToHex(decimalCode: number): string {
  const hexCode = `0x${decimalCode.toString(16).toUpperCase()}`;

  return hexCode;
}

export interface InitLiteSVMReturnType {
  context: LiteSVM;
  provider: LiteSVMProvider;
  accounts: Keypair[];
}

let bunrunReturnCache: InitLiteSVMReturnType | null = null;

export const initLiteSVM = async (numAccounts = 10, initSlot?: bigint, cacheContext = false) => {
  if (cacheContext && bunrunReturnCache) {
    return bunrunReturnCache;
  }

  const accounts: Keypair[] = bunrunReturnCache?.accounts ?? [];

  for (let i = 0; i < numAccounts; i++) {
    const keypair = Keypair.generate();
    accounts.push(keypair);
  }

  const context = fromWorkspace(
    '.',
    [
      {
        name: 'external/squads',
        programId: SQUADS_PROGRAM_ID,
      },
    ],
    [...accounts],
  );

  if (initSlot) {
    await warpToSlot(context, initSlot);
  }

  await setClockTime(context, BigInt(Math.floor(Date.now() / 1000)));

  const provider = new LiteSVMProvider(context);

  anchor.setProvider(provider);

  bunrunReturnCache = {
    context,
    provider,
    accounts: accounts,
  };

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
  seeds: (string | Buffer | PublicKey | BN)[],
  program: TProgram extends Idl ? Program<TProgram> : PublicKey,
) => {
  const programId = (program as Program).programId || (program as PublicKey);

  return PublicKey.findProgramAddressSync(
    [...seeds.map((v) => Buffer.from((v as PublicKey)?.toBuffer?.() ?? (v as string | Buffer)))],
    programId,
  );
};

export const expectTxReverted = async (
  ctx: LiteSVM,
  transaction: Transaction | VersionedTransaction,
  signers: (Keypair | Signer)[],
  opt?: OptionalCommonParams,
) => {
  try {
    await processTransaction(ctx, transaction, signers);
    throw new Error('Expected to be reverted but not reverted');
  } catch (err) {
    const revertMessage = opt.revertedWith?.toString();

    if (revertMessage && !err.toString().includes(revertMessage)) {
      throw new Error(
        `Expected tx to revert with message ${revertMessage}. Err: ${err.toString()}`,
      );
    }
  }
};

export const expectNotReverted = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    expect(true, `Expected tx to not revert, but it reverted. Err: ${err.toString()}`).toEqual(
      false,
    );
  }
};

export const expectEvents = async <TProgram extends Idl>(
  txResult: TransactionMetadata | FailedTransactionMetadata | string[],
  program: Program<TProgram>,
  expectedEvents: { name: string; data: object }[],
) => {
  const parser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));

  const logs = Array.isArray(txResult)
    ? txResult
    : txResult instanceof FailedTransactionMetadata
      ? txResult.meta().logs()
      : txResult.logs();

  const events = parser.parseLogs(logs);

  const format = (obj: object) => {
    if (!obj) return obj;

    const formattedData = Object.entries(obj).map(([key, value]) => {
      if (value instanceof PublicKey) {
        return [key, value.toBase58()];
      }

      if (value instanceof BN) {
        return [key, BigInt(value.toString())];
      }

      if (typeof value === 'object') {
        return [key, format(value)];
      }

      return [key, value];
    });

    return Object.fromEntries(formattedData);
  };

  for (const expectedEv of expectedEvents) {
    const event = Array.from(events).find((v) => v.name === expectedEv.name);

    if (!event) throw new Error(`Expected to emit event ${expectedEv.name} but it wasnt`);

    const expectedEvDataObj = format(expectedEv.data);
    const evDataObj = format(event.data);

    Object.entries(expectedEvDataObj).forEach(([key, value]) => {
      if (!value) return;

      expect(evDataObj).toHaveProperty(key);

      if (typeof value === 'object') {
        expect(evDataObj[key]).toMatchObject(value);
      } else {
        expect(evDataObj[key]).toBe(value);
      }
    });
  }
};

export const expectTxNotReverted = async (
  ctx: LiteSVM,
  transaction: Transaction | VersionedTransaction,
  signers: (Keypair | Signer)[],
) => {
  try {
    return await processTransaction(ctx, transaction, signers);
  } catch (err) {
    console.log(err);
    expect(true, `Expected tx to not revert, but it reverted. Err: ${err.toString()}`).toEqual(
      false,
    );
  }
};

export const warpToSlot = async (ctx: LiteSVM, slot: bigint) => {
  ctx.warpToSlot(slot);
};

export const getRequiredSignerKeysVersionedTransaction = (
  tx: VersionedTransaction,
  addressLookupTableAccounts?: AddressLookupTableAccount[] | null,
): PublicKey[] => {
  const message = tx.message;
  const accountKeys =
    'addressTableLookups' in message && message.addressTableLookups?.length
      ? message.getAccountKeys({
          addressLookupTableAccounts: addressLookupTableAccounts ?? undefined,
        })
      : message.getAccountKeys();

  const signerKeys = new Set<string>();
  for (let i = 0; i < accountKeys.length; i++) {
    if (message.isAccountSigner(i)) {
      const key = accountKeys.get(i);
      if (key) signerKeys.add(key.toBase58());
    }
  }
  return Array.from(signerKeys.values()).map((v) => new PublicKey(v));
};

export const getRequiredSignerKeysTransaction = (tx: Transaction) => {
  const accountKeys = tx.instructions.map((v) => v.keys).flat();

  const signerKeys = new Set<string>();
  for (const account of accountKeys) {
    if (account.isSigner) {
      signerKeys.add(account.pubkey.toBase58());
    }
  }

  return Array.from(signerKeys.values()).map((v) => new PublicKey(v));
};

export const processTransaction = async (
  ctx: LiteSVM,
  transaction: Transaction | VersionedTransaction,
  signers: (Keypair | Signer)[],
) => {
  const signersSet: (Keypair | Signer)[] = [];

  const signersFormatted = signers
    .map((signer) =>
      signer instanceof Keypair
        ? {
            publicKey: signer.publicKey,
            secretKey: signer.secretKey,
          }
        : signer,
    )
    .filter((signer) => {
      if (!signersSet.some((s) => s.publicKey.equals(signer.publicKey))) {
        signersSet.push(signer);
        return true;
      }
      return false;
    });

  // Need to generate new blockhash
  ctx.expireBlockhash();

  if (transaction instanceof Transaction) {
    // const requiredSignerKeys = getRequiredSignerKeysTransaction(transaction);

    // const signers = signersFormatted.filter((s) => requiredSignerKeys.find(v => v.equals(s.publicKey)));

    // if (signers.length !== signersFormatted.length) {
    //   const missingSigners = signersFormatted.filter((s) => !requiredSignerKeys.find(v => v.equals(s.publicKey)));
    // throw new Error(`Missing signers: ${missingSigners.map(v => v.publicKey.toBase58()).join(', ')}`);
    // }

    transaction.recentBlockhash = ctx.latestBlockhash();
    transaction.sign(...signersFormatted);
  } else {
    // const requiredSignerKeys = getRequiredSignerKeysVersionedTransaction(transaction);
    // const signers = signersFormatted.filter((s) => requiredSignerKeys.find(v => v.equals(s.publicKey)));
    // if (signers.length !== requiredSignerKeys.length) {
    //   const missingSigners = requiredSignerKeys.filter((s) => !requiredSignerKeys.find(v => v.equals(s)));
    //   throw new Error(`Missing signers: ${missingSigners.map(v => v.toBase58()).join(', ')}`);
    // }
    transaction.sign([...signersFormatted]);
  }

  handleProcessedTransaction(ctx.simulateTransaction(transaction));

  const res = ctx.sendTransaction(transaction);

  handleProcessedTransaction(res);

  return res;
};

const handleProcessedTransaction = (
  res: FailedTransactionMetadata | TransactionMetadata | SimulatedTransactionInfo,
) => {
  if (res instanceof FailedTransactionMetadata) {
    if (TESTS_LOG_LEVEL === 'debug') {
      console.log(res.meta().logs());
    }

    let panicLog = res
      .meta()
      .logs()
      .find((log) => log.includes('Program log: panicked at'));

    if (!panicLog) {
      const prefix = 'custom program error: ';
      const line = res
        .meta()
        .logs()
        .find((line) => line.indexOf(prefix) !== -1);
      const idx = line?.indexOf(prefix);
      panicLog = idx !== -1 ? line?.slice(idx).trim() : null;
    }
    const errorLog = `Error: ${res.err().toString()}. ${panicLog ? `Panic log: ${panicLog}` : ''}`;
    throw new Error(errorLog);
  } else if (res instanceof TransactionMetadata) {
    if (TESTS_LOG_LEVEL === 'debug') {
      console.log(res.prettyLogs());
    }
  }
};

export const parseUnits = (n: string, decimals = 9) => {
  return parseUnitsViem(n, decimals);
};

export const formatUnits = (n: bigint, decimals = 9) => {
  return +formatUnitsViem(n, decimals);
};

export const createMint = async (
  connection: Connection,
  ctx: LiteSVM,
  payer: Signer,
  tokenAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number,
  keypair = Keypair.generate(),
  programId = TOKEN_PROGRAM_ID,
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
      programId,
    ),
  );

  await processTransaction(ctx, transaction, [payer, keypair]);

  return keypair.publicKey;
};

export const approveMintInstruction = (
  mint: PublicKey,
  payer: Signer,
  approveTo: PublicKey,
  amount: bigint,
  programId = TOKEN_PROGRAM_ID,
) => {
  return createApproveInstruction(
    findATA(mint, payer.publicKey, programId),
    approveTo,
    payer.publicKey,
    amount,
    undefined,
    programId,
  );
};

export const revokeMintInstruction = (
  mint: PublicKey,
  payer: Signer,

  programId = TOKEN_PROGRAM_ID,
) => {
  return createRevokeInstruction(
    findATA(mint, payer.publicKey, programId),
    payer.publicKey,
    undefined,
    programId,
  );
};

export const approveMint = async (
  ctx: LiteSVM,
  mint: PublicKey,
  payer: Signer,
  approveTo: PublicKey,
  amount: bigint,
  programId = TOKEN_PROGRAM_ID,
) => {
  await processTransaction(
    ctx,
    new Transaction().add(approveMintInstruction(mint, payer, approveTo, amount, programId)),
    [payer],
  );
};

export const getOrCreateAta = async (
  context: LiteSVM,
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  signer: Keypair,
  program = TOKEN_PROGRAM_ID,
) => {
  const ata = getAssociatedTokenAddressSync(mint, owner, true, program);
  try {
    const ataAccount = await getAccount(connection, ata, undefined, program);

    return {
      ataAccount,
      ata,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (
      e instanceof TokenAccountNotFoundError ||
      e instanceof TokenInvalidAccountOwnerError ||
      e?.message?.includes('Could not find')
    ) {
      const ix = new Transaction().add(createAtaInx(signer.publicKey, ata, mint, owner, program));

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

export const createAtaIfNotExistsInx = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: { publicKey: PublicKey },
  program = TOKEN_PROGRAM_ID,
) => {
  const ata = getAssociatedTokenAddressSync(mint, owner, true, program);
  try {
    await getAccount(connection, ata, undefined, program);
    return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if (
      e instanceof TokenAccountNotFoundError ||
      e instanceof TokenInvalidAccountOwnerError ||
      e?.message?.includes('Could not find')
    ) {
      return createAtaInx(payer.publicKey, ata, mint, owner, program);
    }

    throw e;
  }
};

export const findATA = (
  token: PublicKey,
  address: PublicKey,
  program = TOKEN_PROGRAM_ID,
): PublicKey => {
  return getAssociatedTokenAddressSync(token, address, true, program);
};

export function createAtaInx(
  payer: PublicKey,
  ataAccount: PublicKey,
  mint: PublicKey,
  owner = payer,
  program = TOKEN_PROGRAM_ID,
) {
  return createAssociatedTokenAccountIdempotentInstruction(payer, ataAccount, owner, mint, program);
}

export const timeTravel = async (ctx: LiteSVM, timestampDelta: bigint) => {
  const currentClock = ctx.getClock();
  ctx.setClock(
    new Clock(
      currentClock.slot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      currentClock.unixTimestamp + timestampDelta,
    ),
  );
};

export const setClockTime = async (ctx: LiteSVM, newTimestamp: bigint) => {
  const currentClock = ctx.getClock();
  ctx.setClock(
    new Clock(
      currentClock.slot,
      newTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      newTimestamp,
    ),
  );
};

export const setClockSlot = async (ctx: LiteSVM, newSlot: bigint) => {
  const currentClock = ctx.getClock();
  ctx.setClock(
    new Clock(
      newSlot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      currentClock.unixTimestamp,
    ),
  );
};

export const setClockEpoch = async (
  ctx: LiteSVM,
  newEpoch: bigint,
  epochStartTimestamp: bigint,
) => {
  const currentClock = ctx.getClock();

  ctx.setClock(
    new Clock(
      currentClock.slot,
      epochStartTimestamp,
      newEpoch,
      currentClock.leaderScheduleEpoch,
      currentClock.unixTimestamp,
    ),
  );
};

export const getTime = async (ctx: LiteSVM) => {
  const currentClock = ctx.getClock();
  return currentClock.unixTimestamp;
};

export const getBalance = async (
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey | null = DEFAULT_PUBKEY,
  programId = TOKEN_PROGRAM_ID,
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
          err?.toString?.()?.includes?.('Could not find')
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

export const fetchAccountNullable = async <TReturn>(
  publicKey: PublicKey,
  account: {
    fetch: (account: PublicKey) => Promise<TReturn>;
  },
  allowNull = false,
) => {
  try {
    return await account.fetch(publicKey);
  } catch {
    if (!allowNull) {
      throw new Error('Account state is empty');
    }
    return null;
  }
};
