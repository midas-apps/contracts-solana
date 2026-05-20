import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { createUpdateFieldInstruction } from '@solana/spl-token-metadata';
import { SystemProgram, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import {
  fetchMTokenMetadataState,
  getAdditionalRentForMetadataUpdates,
  getConfigMetadataUpdates,
  resolveMintAddress,
} from '@/scripts/utils/tokenMetadata';
import type { MetadataUpdate } from '@/scripts/utils/tokenMetadata';

import { getBooleanArg, getMtoken, getNetwork, getOptionalArg } from '../../utils/argumentParser';

const ACTION = 'update-token-metadata';

function getExplicitUpdates(): MetadataUpdate[] {
  const updates: MetadataUpdate[] = [];
  const name = getOptionalArg('name');
  const symbol = getOptionalArg('symbol');
  const uri = getOptionalArg('uri');

  if (name !== undefined) updates.push({ field: 'name', value: name });
  if (symbol !== undefined) updates.push({ field: 'symbol', value: symbol });
  if (uri !== undefined) updates.push({ field: 'uri', value: uri });

  return updates;
}

function dedupeUpdates(updates: MetadataUpdate[]): MetadataUpdate[] {
  const byField = new Map<MetadataUpdate['field'], string>();
  for (const update of updates) {
    byField.set(update.field, update.value);
  }
  return Array.from(byField.entries()).map(([field, value]) => ({ field, value }));
}

function filterChangedUpdates(
  current: { name: string; symbol: string; uri: string },
  updates: MetadataUpdate[],
): MetadataUpdate[] {
  return updates.filter((update) => current[update.field] !== update.value);
}

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  const mintAddress = resolveMintAddress(network, mtoken, getOptionalArg('mint'));
  const fromConfig = getBooleanArg('from-config');
  const dryRun = getBooleanArg('dry-run');
  const skipAuthorityCheck = getBooleanArg('skip-authority-check');

  const requestedUpdates = dedupeUpdates([
    ...(fromConfig ? getConfigMetadataUpdates(mtoken, network) : []),
    ...getExplicitUpdates(),
  ]);

  if (requestedUpdates.length === 0) {
    throw createUserError('No metadata updates requested', [
      'Pass --name, --symbol, --uri, or --from-config true.',
      'Example: yarn update:token-metadata --network mainnet --mtoken solmFONE --symbol solmFONE',
    ]);
  }

  const state = await fetchMTokenMetadataState(provider, mintAddress);
  const updates = filterChangedUpdates(state.metadata, requestedUpdates);

  console.log(`\nUpdating token metadata for ${mtoken} on ${network}`);
  console.log(`Mint:              ${mintAddress.toBase58()}`);
  console.log(`Signer/payer:      ${payer.publicKey.toBase58()}`);
  console.log(`Update authority:  ${state.metadata.updateAuthority?.toBase58() || 'None'}`);

  if (!state.metadata.updateAuthority) {
    throw createUserError('Token metadata is immutable because updateAuthority is None');
  }

  if (!skipAuthorityCheck && !state.metadata.updateAuthority.equals(payer.publicKey)) {
    throw createUserError('Signer is not the current token metadata update authority', [
      `Expected signer: ${state.metadata.updateAuthority.toBase58()}`,
      `Resolved signer: ${payer.publicKey.toBase58()}`,
      'For Fordefi, make sure CUSTOM_SIGNER_SCRIPT_PATH points to a signer that supports update-token-metadata for this mToken.',
    ]);
  }

  if (updates.length === 0) {
    console.log('\nNo changes needed. Requested metadata already matches on-chain values.');
    return;
  }

  const additionalRent = await getAdditionalRentForMetadataUpdates(
    provider,
    mintAddress,
    state.metadata,
    updates,
  );

  console.log('\nPlanned updates');
  for (const update of updates) {
    console.log(`- ${update.field}: "${state.metadata[update.field]}" -> "${update.value}"`);
  }
  console.log(`Additional rent:   ${additionalRent} lamports`);

  if (dryRun) {
    console.log('\nDry run only. No transaction sent.');
    return;
  }

  const tx = new Transaction();

  if (additionalRent > 0) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: mintAddress,
        lamports: additionalRent,
      }),
    );
  }

  for (const update of updates) {
    tx.add(
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintAddress,
        updateAuthority: state.metadata.updateAuthority,
        field: update.field,
        value: update.value,
      }),
    );
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: ACTION,
    comment: `Update ${mtoken} token metadata`,
    mToken: mtoken,
    waitForTx: false,
  });

  console.log('');
  if (result.signature) {
    console.log('✅ Token metadata update submitted');
    console.log(`Signature: ${result.signature}`);
  } else if (result.txId) {
    console.log(`Transaction created | Fordefi TX ID: ${result.txId}`);
  } else {
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

const network = getNetwork();
const mtoken = getOptionalArg('mtoken') || getOptionalArg('m');
executeNetworkScript(network, main, ACTION, mtoken);

// Usage:
//   yarn update:token-metadata --network mainnet --mtoken solmFONE --symbol solmFONE --dry-run true
//   yarn update:token-metadata --network mainnet --mtoken solmFONE --symbol solmFONE
//   yarn update:token-metadata --network mainnet --mtoken solmFONE --from-config true
//   yarn update:token-metadata --network devnet --mtoken solmFONE --name "Midas Fasanara ONE" --symbol solmFONE --uri "https://..."
