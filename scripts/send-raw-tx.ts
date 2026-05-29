import fs from 'fs';

import { AnchorProvider } from '@coral-xyz/anchor';
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

const argv = yargs(hideBin(process.argv))
  .option('network', {
    alias: 'n',
    type: 'string',
    demandOption: true,
    describe: 'Target network (mainnet, devnet)',
  })
  .option('action', {
    type: 'string',
    demandOption: true,
    describe: 'Custom signer vault action',
  })
  .option('tx', {
    type: 'string',
    describe: 'Raw transaction string (base58 by default)',
  })
  .option('tx-file', {
    type: 'string',
    describe: 'Path to file containing the raw transaction (use "-" for stdin)',
  })
  .option('encoding', {
    type: 'string',
    default: 'base58',
    choices: ['base58', 'base64'] as const,
    describe: 'Encoding of the raw transaction',
  })
  .option('mtoken', {
    alias: 'm',
    type: 'string',
    describe: 'MToken identifier (required for mtoken-specific actions)',
  })
  .option('comment', {
    type: 'string',
    describe: 'Human-readable comment for custom signer audit trail',
  })
  .option('wait', {
    type: 'boolean',
    default: true,
    describe: 'Wait for on-chain confirmation',
  })
  .check((args) => {
    if (!args.tx && !args['tx-file']) {
      throw new Error('Either --tx or --tx-file is required');
    }
    return true;
  })
  .help()
  .parseSync();

function readRawTransaction(): string {
  if (argv.tx) {
    return argv.tx.trim();
  }

  const txFile = argv['tx-file']!;

  if (txFile === '-') {
    return fs.readFileSync(0, 'utf-8').trim();
  }

  if (!fs.existsSync(txFile)) {
    throw createUserError(`File not found: ${txFile}`);
  }

  return fs.readFileSync(txFile, 'utf-8').trim();
}

function decodeTransaction(raw: string, encoding: string): Transaction | VersionedTransaction {
  const buffer = encoding === 'base64' ? Buffer.from(raw, 'base64') : Buffer.from(bs58.decode(raw));

  try {
    return VersionedTransaction.deserialize(buffer);
  } catch {
    return Transaction.from(buffer);
  }
}

async function main(provider: AnchorProvider, _payer: Wallet) {
  const raw = readRawTransaction();
  const tx = decodeTransaction(raw, argv.encoding);
  const isVersioned = tx instanceof VersionedTransaction;

  console.log(`Transaction type: ${isVersioned ? 'VersionedTransaction' : 'Legacy Transaction'}`);
  console.log(`Vault action:     ${argv.action}`);
  console.log(`Network:          ${argv.network}`);
  console.log(`Fee payer:        ${provider.publicKey.toBase58()}`);

  if (argv.comment) {
    console.log(`Comment:          ${argv.comment}`);
  }

  console.log('');
  console.log('Sending transaction ...');

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: argv.action,
    comment: argv.comment ?? `Raw tx via ${argv.action}`,
    mToken: argv.mtoken,
    waitForTx: argv.wait,
  });

  console.log('');

  if (result.signature) {
    console.log(`Transaction confirmed on-chain`);
    console.log(`Signature: ${result.signature}`);
  } else if (result.txId) {
    console.log(`Transaction submitted to custom signer (pending approval)`);
    console.log(`TX ID: ${result.txId}`);
  } else {
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

const network = argv.network;
const action = argv.action;
const mtoken = argv.mtoken;

executeNetworkScript(network, main, action, mtoken);

// Usage: yarn tsx scripts/send-raw-tx.ts --network mainnet --action <action> --tx <tx_base58>
