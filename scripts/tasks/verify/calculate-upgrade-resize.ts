import fs from 'fs';

import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { LOADER_V3_PROGRAM_ADDRESS } from '@solana-program/loader-v3';

import { createUserError } from '@/common/errorHandler';
import { programAddresses } from '@/common/programs';
import { executeNetworkScript } from '@/common/scriptRunner';
import { getNetwork, getProgram } from '@/scripts/utils/argumentParser';

async function main(provider: AnchorProvider, _payer: Wallet) {
  const program = getProgram();

  const programId = programAddresses[program];

  if (!programId) {
    throw createUserError(`Program id for ${program} not found`);
  }

  const [programDataPda] = PublicKey.findProgramAddressSync(
    [programId.toBuffer()],
    new PublicKey(LOADER_V3_PROGRAM_ADDRESS),
  );

  const accountInfo = await provider.connection.getAccountInfo(programDataPda);

  if (!accountInfo) {
    throw createUserError(
      `No program data found for ${programId.toBase58()} at address ${programDataPda.toBase58()}`,
    );
  }

  const dataLength = accountInfo.data.slice(49).length;

  const newProgramBytes = fs.readFileSync(`./target/deploy/${program}.so`);

  const newProgramLength = newProgramBytes.length;

  const difference = newProgramLength - dataLength;

  const additionalBytes = difference > 0 ? difference : 0;

  console.log(`Bytes difference between new and current program: ${difference} bytes`);
  console.log(`Required additional bytes: ${additionalBytes} bytes`);
}

const network = getNetwork();
executeNetworkScript(network, main);
