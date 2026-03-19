import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createSolanaAddressBookContract, executeNetworkScript } from '@/common/scriptRunner';
import { getTokenAddresses } from '@/scripts/utils/addressQueries';
import { getMtoken, getNetwork } from '@/scripts/utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  const tokenAddresses = getTokenAddresses(network, mtoken);
  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mtoken} on ${network}`);
  }

  for (const [key, value] of Object.entries(tokenAddresses)) {
    if (!value) {
      continue;
    }

    let address = typeof value === 'string' ? value : undefined;
    let contractName = '';
    let contractTag: string | undefined;

    if (key === 'redeemer') {
      contractName = 'Redemption Vault';
      address = tokenAddresses.redeemer.commonVault.toBase58();
    } else if (key.startsWith('minter')) {
      contractName = 'Minter Vault';
      address = tokenAddresses.minter.commonVault.toBase58();
    } else if (key === 'mTokenUnderlyingFeed') {
      contractName = 'Oracle';
      address = tokenAddresses.mTokenUnderlyingFeed.toBase58();
    } else if (key === 'mToken') {
      contractName = mtoken;
      address = tokenAddresses.mToken.toBase58();
    } else if (key === 'mTokenDataFeed') {
      contractName = 'Oracle';
      contractTag = 'datafeed';
      address = tokenAddresses.mTokenDataFeed.toBase58();
    }

    if (!contractName || !address) {
      continue;
    }
    console.log('Adding to address book', contractName, address, contractTag);

    const result = await createSolanaAddressBookContract({
      network,
      mToken: mtoken,
      address,
      contractName,
      contractTag,
    });

    console.log('Successfully added to address book', result);
  }
}
const network = getNetwork();

executeNetworkScript(network, main, 'deployer');
