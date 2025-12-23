import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { createAtaIfNotExistsInx, formatUnits, parseUnits } from '@/test/helpers/common.helpers';

import { getNetwork, getOptionalArg, getPaymentToken } from '../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountArg = getOptionalArg('amount');
  const amountStr = amountArg ? String(amountArg) : '1000';
  const recipientArg = getOptionalArg('recipient') || getOptionalArg('to');

  let recipient: PublicKey;
  try {
    recipient = recipientArg ? new PublicKey(recipientArg) : payer.publicKey;
  } catch (error) {
    throw new Error(`Invalid recipient address: ${recipientArg}\n${error}`);
  }

  const feed = addresses[network]?.feeds?.[paymentToken];
  const mint = feed?.token;
  const tokenProgram = feed?.tokenProgram || TOKEN_PROGRAM_ID;

  if (!mint) {
    throw new Error(
      `${paymentToken} mint address not found for network: ${network}.\n` +
        `Deploy a mock payment token: yarn deploy:mock-payment-token --network ${network} --payment-token ${paymentToken}`,
    );
  }

  console.log(`Minting ${amountStr} ${paymentToken} on ${network}`);
  console.log(`${paymentToken} Mint: ${mint.toBase58()}`);
  console.log(`Token Program: ${tokenProgram.toBase58()}`);
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Recipient: ${recipient.toBase58()}`);

  const mintInfo = await getMint(provider.connection, mint, undefined, tokenProgram);
  console.log(`Mint Authority: ${mintInfo.mintAuthority?.toBase58() || 'None (frozen)'}`);

  if (!mintInfo.mintAuthority || !mintInfo.mintAuthority.equals(payer.publicKey)) {
    throw new Error(
      `You don't have mint authority for this ${paymentToken} mint.\n` +
        `Mint authority: ${mintInfo.mintAuthority?.toBase58() || 'None'}\n` +
        `Your address: ${payer.publicKey.toBase58()}\n`,
    );
  }

  const amount = parseUnits(amountStr, mintInfo.decimals);
  const ata = getAssociatedTokenAddressSync(mint, recipient, true, tokenProgram);
  console.log(`Associated Token Account: ${ata.toBase58()}`);

  // Get balance before minting
  let balanceBefore = BigInt(0);
  try {
    const tokenAccount = await getAccount(provider.connection, ata, undefined, tokenProgram);
    balanceBefore = tokenAccount.amount;
    console.log(`Balance before: ${formatUnits(balanceBefore, mintInfo.decimals)} ${paymentToken}`);
  } catch {
    console.log(`Balance before: 0 ${paymentToken} (account doesn't exist yet)`);
  }

  const transaction = new Transaction();
  const ataInstruction = await createAtaIfNotExistsInx(
    provider.connection,
    mint,
    recipient,
    payer,
    tokenProgram,
  );
  if (ataInstruction) {
    transaction.add(ataInstruction);
  }

  transaction.add(
    createMintToInstruction(mint, ata, payer.publicKey, amount, undefined, tokenProgram),
  );

  console.log(`Minting ${amountStr} ${paymentToken}...`);
  const result = await sendAndWaitForCustomSolanaTxSign(provider, transaction, [], {
    comment: `Mint ${amountStr} ${paymentToken} to ${recipient.toBase58()}`,
  });

  // Get balance after minting
  const tokenAccountAfter = await getAccount(provider.connection, ata, undefined, tokenProgram);
  const balanceAfter = tokenAccountAfter.amount;

  console.log(`✅ Successfully minted ${amountStr} ${paymentToken}`);
  console.log(`Balance after: ${formatUnits(balanceAfter, mintInfo.decimals)} ${paymentToken}`);
  console.log(`Transaction signature: ${result.signature}`);
  console.log(
    `View on Solana Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=${network}`,
  );
}

executeNetworkScript(getNetwork(), main);

// yarn tsx scripts/verify/mint-payment-token.ts --network devnet --payment-token USDC --amount 1000
// yarn tsx scripts/verify/mint-payment-token.ts --network devnet --payment-token USDC --amount 1000 --recipient <address>
