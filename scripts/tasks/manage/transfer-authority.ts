import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  AuthorityType,
  createSetAuthorityInstruction,
  getMetadataPointerState,
  getMint,
  getPermanentDelegate,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createUpdateAuthorityInstruction } from '@solana/spl-token-metadata';
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
  txId?: string;
  skipped?: boolean;
  error?: string;
}

function formatTransferTx(result: TransferResult): string {
  const id = result.signature || result.txId;
  return id ? `${id.slice(0, 16)}...` : 'submitted';
}

function logTransferResult(result: TransferResult) {
  if (result.skipped) {
    console.log(`   ${result.authorityType}: Already transferred`);
    return;
  }

  if (result.error) {
    console.log(`   ${result.authorityType}: Failed: ${result.error}`);
    return;
  }

  console.log(`   ${result.authorityType}: Done (${formatTransferTx(result)})`);
}

async function transferAuthority(
  provider: AnchorProvider,
  mint: PublicKey,
  signer: PublicKey,
  currentAuthority: PublicKey | null | undefined,
  authorityType: AuthorityType,
  newAuthority: PublicKey,
  authorityName: string,
): Promise<TransferResult> {
  const result: TransferResult = {
    authorityType: authorityName,
    newAuthority: newAuthority.toString(),
  };

  // Skip if already transferred (same authority)
  if (currentAuthority?.equals(newAuthority)) {
    result.skipped = true;
    return result;
  }

  if (!currentAuthority) {
    result.error = `${authorityName} authority is not set`;
    return result;
  }

  if (!currentAuthority.equals(signer)) {
    result.error = `${authorityName} authority is ${currentAuthority.toString()}, not signer ${signer.toString()}`;
    return result;
  }

  const tx = new Transaction().add(
    createSetAuthorityInstruction(
      mint,
      signer,
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
    result.txId = txResult.txId;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function transferTokenMetadataUpdateAuthority(
  provider: AnchorProvider,
  mint: PublicKey,
  signer: PublicKey,
  currentAuthority: PublicKey | null | undefined,
  newAuthority: PublicKey,
): Promise<TransferResult> {
  const authorityName = 'TokenMetadataUpdateAuthority';
  const result: TransferResult = {
    authorityType: authorityName,
    newAuthority: newAuthority.toString(),
  };

  if (currentAuthority?.equals(newAuthority)) {
    result.skipped = true;
    return result;
  }

  if (!currentAuthority) {
    result.error = `${authorityName} is not set; metadata is immutable`;
    return result;
  }

  if (!currentAuthority.equals(signer)) {
    result.error = `${authorityName} is ${currentAuthority.toString()}, not signer ${signer.toString()}`;
    return result;
  }

  const tx = new Transaction().add(
    createUpdateAuthorityInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      oldAuthority: signer,
      newAuthority,
    }),
  );

  try {
    const txResult = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
      action: 'deployer',
      comment: `Transfer ${authorityName}`,
      waitForTx: true,
      pollingIntervalMs: 1000,
      timeoutDurationMs: 120 * 1000,
    });
    result.signature = txResult.signature;
    result.txId = txResult.txId;
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
  const mintInfo = await getMint(provider.connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
  const permanentDelegate = getPermanentDelegate(mintInfo);
  const metadataPointer = getMetadataPointerState(mintInfo);
  const tokenMetadata = await getTokenMetadata(
    provider.connection,
    mint,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );
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
  const signer = payer.publicKey;
  const currentAuthorities = new Map<AuthorityType, PublicKey | null | undefined>([
    [AuthorityType.MintTokens, mintInfo.mintAuthority],
    [AuthorityType.FreezeAccount, mintInfo.freezeAuthority],
    [AuthorityType.PermanentDelegate, permanentDelegate?.delegate],
    [AuthorityType.MetadataPointer, metadataPointer?.authority],
  ]);

  // Transfer authorities to Token Authority PDA
  console.log('🔐 Transferring to Token Authority PDA:');
  for (const { type, name } of TOKEN_AUTHORITY_TYPES) {
    console.log(`   ${name}: transferring`);
    const result = await transferAuthority(
      provider,
      mint,
      signer,
      currentAuthorities.get(type),
      type,
      tokenAuthorityPda,
      name,
    );
    results.push(result);
    logTransferResult(result);
  }

  // Transfer metadata authorities to external address
  console.log('\n🔑 Transferring to external metadata authority:');
  if (skipMetadata) {
    console.log('   ⏭️  Skipped (--skip-metadata flag)');
  } else if (!metadataAuthority) {
    console.log('   ⚠️  Skipped (metadataAuthority not configured in grantRoles)');
    console.log('   💡 Add metadataAuthority to your token config to enable this transfer');
  } else {
    console.log(`   ${METADATA_AUTHORITY.name}: transferring`);
    const result = await transferAuthority(
      provider,
      mint,
      signer,
      currentAuthorities.get(METADATA_AUTHORITY.type),
      METADATA_AUTHORITY.type,
      metadataAuthority,
      METADATA_AUTHORITY.name,
    );
    results.push(result);
    logTransferResult(result);

    console.log('   TokenMetadataUpdateAuthority: transferring');
    const metadataUpdateResult = await transferTokenMetadataUpdateAuthority(
      provider,
      mint,
      signer,
      tokenMetadata?.updateAuthority,
      metadataAuthority,
    );
    results.push(metadataUpdateResult);
    logTransferResult(metadataUpdateResult);
  }

  console.log('\n📊 Summary:');
  const successful = results.filter((r) => (r.signature || r.txId) && !r.error).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => r.error).length;

  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⏭️  Skipped:    ${skipped}`);
  console.log(`   ❌ Failed:     ${failed}`);

  if (failed > 0) {
    throw createUserError(
      'Some authority transfers failed. Fix the reported authority state and run the script again.',
      results
        .filter((result) => result.error)
        .map((result) => `${result.authorityType}: ${result.error}`),
    );
  }

  console.log('\n✅ All authority transfers completed successfully!');
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');

// Usage:
//   yarn transfer:authority --network mainnet --mtoken solmFONE
//   yarn transfer:authority --network devnet --mtoken solmFONE
//   yarn transfer:authority --network mainnet --mtoken solmFONE --skip-metadata true
