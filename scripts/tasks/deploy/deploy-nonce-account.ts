import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';

import { deployNonceAccount } from '../../deploy/nonce-account';
import { getAuthority, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const authority = getAuthority();

  console.log(`Deploying nonce account for authority: ${authority.toBase58()}`);
  console.log(`Network: ${network}`);

  // Check if we can reach the authority account (basic validation)
  const accountInfo = await provider.connection.getAccountInfo(authority);
  if (!accountInfo) {
    console.warn(`⚠️  Authority account ${authority.toBase58()} does not exist on-chain yet`);
    console.warn('   Make sure the Fordefi vault is funded before using this nonce account');
  }

  const nonceAccount = await deployNonceAccount({ provider, payer, network }, { authority });

  console.log('\n✅ Nonce account deployed successfully');
  console.log(`Authority: ${authority.toBase58()}`);
  console.log(`Nonce Account: ${nonceAccount.toBase58()}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');

// Usage: yarn tsx scripts/tasks/deploy/deploy-nonce-account.ts --authority <authority-address> --network <network>
