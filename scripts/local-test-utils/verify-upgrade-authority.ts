import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { getNetwork } from '../utils/argumentParser';

// Program IDs from Anchor.toml
const PROGRAMS = {
  access_control: new PublicKey('7fmev1BQVc9LEXsMDoJs63muHR1B2uSAw1963zfVrpJP'),
  data_feed: new PublicKey('6vrYAbfttohJKguPRzspHUW6fn61KDyjzog3q8YRG6yq'),
  midas_vaults: new PublicKey('DHfwFSG3JQ2qdX1Ub2QPuDsk9FMQUwyXyZqAs4gGeLnQ'),
  token_authority: new PublicKey('GYmnAy5UiKMYuuwJubKKC5WLnWSW3qLo4JFqX4rBqHKE'),
};

const BPF_UPGRADEABLE_LOADER = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

async function getUpgradeAuthority(
  provider: AnchorProvider,
  programId: PublicKey,
): Promise<{ authority: PublicKey | null; programDataAddress: PublicKey } | null> {
  try {
    const programAccount = await provider.connection.getAccountInfo(programId);
    if (!programAccount) {
      return null;
    }

    // Check if owned by BPF Upgradeable Loader
    if (!programAccount.owner.equals(BPF_UPGRADEABLE_LOADER)) {
      console.log(`  Program not owned by BPF Upgradeable Loader`);
      return null;
    }

    // First 4 bytes are account type, next 32 bytes are programdata address
    const programDataAddress = new PublicKey(programAccount.data.slice(4, 36));

    const programDataAccount = await provider.connection.getAccountInfo(programDataAddress);
    if (!programDataAccount) {
      return null;
    }

    // ProgramData account: first 4 bytes type, next 8 bytes slot, then 1 byte option, then 32 bytes authority
    const hasAuthority = programDataAccount.data[12] === 1;
    const authority = hasAuthority ? new PublicKey(programDataAccount.data.slice(13, 45)) : null;

    return { authority, programDataAddress };
  } catch (error) {
    console.error(`  Error fetching program info: ${error}`);
    return null;
  }
}

async function main(provider: AnchorProvider, payer: Wallet) {
  const network = getNetwork();
  console.log(`\nVerifying upgrade authorities on ${network}`);
  console.log(`Wallet: ${payer.publicKey.toString()}\n`);

  let allMatch = true;

  for (const [name, programId] of Object.entries(PROGRAMS)) {
    const result = await getUpgradeAuthority(provider, programId);

    if (!result) {
      console.log(`${name}: not found`);
      continue;
    }

    if (!result.authority) {
      console.log(`${name}: no authority (immutable)`);
      allMatch = false;
    } else {
      const matches = result.authority.equals(payer.publicKey);
      console.log(`${name}: ${result.authority.toString()} ${matches ? '✓' : '✗'}`);
      if (!matches) allMatch = false;
    }
  }

  console.log(allMatch ? '\n✅ All programs upgradeable' : '\n❌ Some programs not upgradeable');
}

const network = getNetwork();
executeNetworkScript(network, main);
