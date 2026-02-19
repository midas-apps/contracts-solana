
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import { getAuthority, getNetwork, getProgram } from '@/scripts/utils/argumentParser';
import { PublicKey, Transaction } from '@solana/web3.js';
import { programAddresses } from '@/common/programs';
import { LOADER_V3_PROGRAM_ADDRESS } from '@solana-program/loader-v3';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getSetAuthorityInstructionIx, getUpgradeAuthority } from '@/scripts/utils/loaderProgramHelpers';
import { sendTxWithTimelock } from '@/scripts/deploy/timelock';
import * as multisig from '@sqds/multisig';

async function main(
    provider: AnchorProvider,
    payer: Wallet,
    network: string,
) {
    let newAuthority = getAuthority(false);
    const program = getProgram();

    const timelock = getTimelockAddress(network);

    if (!timelock) {
        throw createUserError(`Timelock not found for network ${network}`,);
    }

    if (!newAuthority) {
        console.log('Authority not provided, will use timelock vault as new authority');
        newAuthority = timelock.vault;
    }

    console.log(`Transferring upgrade authority for program ${program} to ${newAuthority.toBase58()} on network ${network}`);

    const common = { provider, payer, network };

    const programId = programAddresses[program];

    if (!programId) {
        throw createUserError(`Program id for ${program} not found`,);
    }

    const [programDataPda] = PublicKey.findProgramAddressSync(
        [programId.toBuffer()],
        new PublicKey(LOADER_V3_PROGRAM_ADDRESS)
    );

    const data = await provider.connection.getAccountInfo(programDataPda);

    if (!data) {
        throw createUserError(`No program data found for ${program} at address ${programDataPda.toBase58()}`);
    }

    const currentAuthority = await getUpgradeAuthority(provider.connection, programId);

    if (!currentAuthority) {
        throw createUserError(`No upgrade authority found for ${programId.toBase58()}`);
    }

    if (currentAuthority.equals(newAuthority)) {
        throw createUserError(`New authority is the same as the current authority`);
    }

    if (!newAuthority.equals(timelock.vault) && !newAuthority.equals(payer.publicKey)) {
        throw createUserError(`New authority is not the timelock vault or the payer, it's ${newAuthority.toBase58()}`);
    }

    const inx = getSetAuthorityInstructionIx({
        bufferOrProgramDataAccount: programDataPda,
        currentAuthority: currentAuthority,
        newAuthority: newAuthority,
    });

    const { tx, newTransactionIndex } = currentAuthority.equals(timelock.vault) ? await sendTxWithTimelock(common.provider.connection, {
        instructions: [inx],
        timelock: timelock.multisig,
        signer: payer.publicKey,
        action: { type: 'create' },
    }) : { tx: new Transaction().add(inx), newTransactionIndex: undefined };

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'update-timelock',
        comment: `Transfer upgrade authority of ${program} to ${newAuthority.toBase58()} on network ${network}`,
        waitForTx: false,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

    console.log(`New transaction index: ${newTransactionIndex?.toString()}`);

    console.log(result)

    if (result.signature) {
        console.log(`Transaction signature: ${result.signature}`);
    }
}

const network = getNetwork();

executeNetworkScript(
    network,
    (provider, payer, network) =>
        main(provider, payer as Wallet, network),
    'update-timelock'
);
