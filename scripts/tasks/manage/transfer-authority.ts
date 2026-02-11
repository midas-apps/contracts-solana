import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  AuthorityType,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg } from '../../utils/argumentParser';

// Authorities that go to Token Authority PDA (program-controlled)
const TOKEN_AUTHORITY_TYPES = [
  { type: AuthorityType.MintTokens, name: 'MintTokens' },
  { type: AuthorityType.FreezeAccount, name: 'FreezeAccount' },
  { type: AuthorityType.PermanentDelegate, name: 'PermanentDelegate' },
] as const;

// Authority that goes to external address (custodied manual control)
const METADATA_AUTHORITY = { type: AuthorityType.MetadataPointer, name: 'MetadataPointer' };

interface TransferResult {
  authorityType: string;
  newAuthority: string;
  signature?: string;
  skipped?: boolean;
  error?: string;
}

async function transferAuthority(
  provider: AnchorProvider,
  mint: PublicKey,
  currentAuthority: PublicKey,
  authorityType: AuthorityType,
  newAuthority: PublicKey,
  authorityName: string,
): Promise<TransferResult> {
  const result: TransferResult = {
    authorityType: authorityName,
    newAuthority: newAuthority.toString(),
  };

  // Skip if already transferred (same authority)
  if (currentAuthority.equals(newAuthority)) {
    result.skipped = true;
    return result;
  }

  const tx = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      currentAuthority,
      authorityType,
      newAuthority,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  try {
    const txResult = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
      action: 'deployer',
      comment: `Transfer ${authorityName} authority`,
      waitForTx: true,
      pollingIntervalMs: 1000,
      timeoutDurationMs: 120 * 1000,
    });
    result.signature = txResult.signature;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  const skipMetadata = getOptionalArg('skip-metadata') === 'true';

  console.log(`\n🔄 Transferring authorities for ${mtoken} on ${network}\n`);

  // Load config and addresses
  const config = loadTokenConfig(mtoken, network);
  const tokenAddrs = getTokenAddresses(network, mtoken);

  if (!tokenAddrs?.mToken) {
    throw createUserError(`mToken not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-mint --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (!tokenAddrs?.tokenAuthority?.account) {
    throw createUserError(`Token Authority not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-authority --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const mint = tokenAddrs.mToken;
  const tokenAuthorityPda = tokenAddrs.tokenAuthority.account;
  const metadataAuthority = config.grantRoles?.metadataAuthority
    ? new PublicKey(config.grantRoles.metadataAuthority)
    : undefined;

  console.log('📋 Configuration:');
  console.log(`   mToken:              ${mint.toString()}`);
  console.log(`   Token Authority PDA: ${tokenAuthorityPda.toString()}`);
  console.log(
    `   Metadata Authority:  ${metadataAuthority?.toString() ?? '(not configured - will skip)'}\n`,
  );

  const results: TransferResult[] = [];
  const currentAuthority = payer.publicKey;

  // Transfer authorities to Token Authority PDA
  console.log('🔐 Transferring to Token Authority PDA:');
  for (const { type, name } of TOKEN_AUTHORITY_TYPES) {
    process.stdout.write(`   ${name}... `);
    const result = await transferAuthority(
      provider,
      mint,
      currentAuthority,
      type,
      tokenAuthorityPda,
      name,
    );
    results.push(result);

    if (result.skipped) {
      console.log('⏭️  Already transferred');
    } else if (result.error) {
      console.log(`❌ Failed: ${result.error}`);
    } else {
      console.log(`✅ Done (${result.signature?.slice(0, 16)}...)`);
    }
  }

  // Transfer MetadataPointer to external address
  console.log('\n🔑 Transferring to external (MetadataPointer):');
  if (skipMetadata) {
    console.log('   ⏭️  Skipped (--skip-metadata flag)');
  } else if (!metadataAuthority) {
    console.log('   ⚠️  Skipped (metadataAuthority not configured in grantRoles)');
    console.log('   💡 Add metadataAuthority to your token config to enable this transfer');
  } else {
    process.stdout.write(`   ${METADATA_AUTHORITY.name}... `);
    const result = await transferAuthority(
      provider,
      mint,
      currentAuthority,
      METADATA_AUTHORITY.type,
      metadataAuthority,
      METADATA_AUTHORITY.name,
    );
    results.push(result);

    if (result.skipped) {
      console.log('⏭️  Already transferred');
    } else if (result.error) {
      console.log(`❌ Failed: ${result.error}`);
    } else {
      console.log(`✅ Done (${result.signature?.slice(0, 16)}...)`);
    }
  }

  console.log('\n📊 Summary:');
  const successful = results.filter((r) => r.signature && !r.error).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => r.error).length;

  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⏭️  Skipped:    ${skipped}`);
  console.log(`   ❌ Failed:     ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some transfers failed. You may need to run this script again.');
  } else {
    console.log('\n✅ All authority transfers completed successfully!');
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
