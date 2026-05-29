import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { createUpdateAuthorityInstruction } from '@solana/spl-token-metadata';
import { PublicKey, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { fetchMTokenMetadataState, resolveMintAddress } from '@/scripts/utils/tokenMetadata';

import {
  getBooleanArg,
  getMtoken,
  getNetwork,
  getOptionalArg,
  parsePublicKey,
} from '../../utils/argumentParser';

const ACTION = 'deployer';

function getNewAuthority(): PublicKey | null {
  const newAuthority = getOptionalArg('new-authority');

  if (!newAuthority) {
    throw createUserError('New authority is required', ['Use --new-authority <pubkey>']);
  }

  return parsePublicKey(newAuthority, 'new authority');
}

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  const mintAddress = resolveMintAddress(network, mtoken, getOptionalArg('mint'));
  const dryRun = getBooleanArg('dry-run');
  const skipAuthorityCheck = getBooleanArg('skip-authority-check');
  const newAuthority = getNewAuthority();

  const state = await fetchMTokenMetadataState(provider, mintAddress);

  console.log(`\nTransferring token metadata update authority for ${mtoken} on ${network}`);
  console.log(`Mint:              ${mintAddress.toBase58()}`);
  console.log(`Signer/payer:      ${payer.publicKey.toBase58()}`);
  console.log(`Current authority: ${state.metadata.updateAuthority?.toBase58() || 'None'}`);
  console.log(`New authority:     ${newAuthority?.toBase58() || 'None (immutable)'}`);

  if (!state.metadata.updateAuthority) {
    throw createUserError('Token metadata is already immutable because updateAuthority is None');
  }

  if (!skipAuthorityCheck && !state.metadata.updateAuthority.equals(payer.publicKey)) {
    throw createUserError('Signer is not the current token metadata update authority', [
      `Expected signer: ${state.metadata.updateAuthority.toBase58()}`,
      `Resolved signer: ${payer.publicKey.toBase58()}`,
      'For Fordefi, make sure CUSTOM_SIGNER_SCRIPT_PATH points to a signer that supports the deployer action for this network.',
    ]);
  }

  if (newAuthority && state.metadata.updateAuthority.equals(newAuthority)) {
    console.log('\nNo changes needed. New authority already matches current authority.');
    return;
  }

  if (dryRun) {
    console.log('\nDry run only. No transaction sent.');
    return;
  }

  const tx = new Transaction().add(
    createUpdateAuthorityInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mintAddress,
      oldAuthority: state.metadata.updateAuthority,
      newAuthority,
    }),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: ACTION,
    comment: `Transfer ${mtoken} token metadata update authority`,
    mToken: mtoken,
    waitForTx: false,
  });

  console.log('');
  if (result.signature) {
    console.log('✅ Token metadata authority transfer submitted');
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
//   yarn transfer:token-metadata-authority --network mainnet --mtoken solmFONE --new-authority <pubkey> --dry-run true
//   yarn transfer:token-metadata-authority --network mainnet --mtoken solmFONE --new-authority <pubkey>
