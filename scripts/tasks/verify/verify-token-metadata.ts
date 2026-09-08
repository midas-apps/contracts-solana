import { AnchorProvider } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';
import { MProduct, isMProduct } from '@/common/tokenTypes';
import { fetchMTokenMetadataState, resolveMintAddress } from '@/scripts/utils/tokenMetadata';

import { getNetwork, getOptionalArg } from '../../utils/argumentParser';

function getOptionalMtoken(): MProduct | undefined {
  const mtoken = getOptionalArg('mtoken') || getOptionalArg('m');
  if (!mtoken) return undefined;
  if (!isMProduct(mtoken)) {
    throw new Error(
      `Invalid token '${mtoken}'. Must be one of: ${Object.values(MProduct).join(', ')}`,
    );
  }
  return mtoken;
}

async function main(provider: AnchorProvider, _payer: unknown, network: string) {
  const mtoken = getOptionalMtoken();
  const mintAddress = resolveMintAddress(network, mtoken, getOptionalArg('mint'));
  const state = await fetchMTokenMetadataState(provider, mintAddress);

  console.log('\nToken metadata');
  console.log(`Network:                    ${network}`);
  if (mtoken) console.log(`mToken:                     ${mtoken}`);
  console.log(`Mint:                       ${state.mintAddress.toBase58()}`);
  console.log(`Extensions:                 ${state.extensions.join(', ')}`);
  console.log(`Metadata pointer address:   ${state.metadataAddress?.toBase58() || 'None'}`);
  console.log(
    `Metadata pointer authority: ${state.metadataPointerAuthority?.toBase58() || 'None'}`,
  );
  console.log(
    `Metadata update authority:  ${state.metadata.updateAuthority?.toBase58() || 'None'}`,
  );
  console.log(`Permanent delegate:         ${state.permanentDelegate?.toBase58() || 'None'}`);
  console.log(`Account size:               ${state.accountSize} bytes`);
  console.log(`Lamports:                   ${state.lamports}`);
  console.log('\nFields');
  console.log(`Name:                       ${state.metadata.name}`);
  console.log(`Symbol:                     ${state.metadata.symbol}`);
  console.log(`URI:                        ${state.metadata.uri || '(empty)'}`);
  if (state.metadata.additionalMetadata.length > 0) {
    console.log(`Additional metadata:        ${JSON.stringify(state.metadata.additionalMetadata)}`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage:
//   yarn verify:token-metadata --network mainnet --mtoken solmFONE
//   yarn verify:token-metadata --network devnet --mtoken solmFONE
//   yarn verify:token-metadata --network mainnet --mint <mint-address>
