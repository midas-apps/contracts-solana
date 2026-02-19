
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import { getAdditionalBytes, getBufferAccount, getNetwork, getProgram } from '@/scripts/utils/argumentParser';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { programAddresses } from '@/common/programs';
import { LOADER_V3_PROGRAM_ADDRESS } from '@solana-program/loader-v3';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getMultisigInfo, sendTxWithTimelock } from '@/scripts/deploy/timelock';
import { getExtendProgramInstructionIx, getUpgradeAuthority, getUpgradeInstructionIx } from '@/scripts/utils/loaderProgramHelpers';

async function main(
    provider: AnchorProvider,
    payer: Wallet,
    network: string
) {
    const bufferAccount = getBufferAccount();
    const program = getProgram();
    const additionalBytes = getAdditionalBytes();

    console.log(`Proposing upgrade of ${program} program trough the timelock for: ${network}`);

    const existingTimelock = getTimelockAddress(network);
    if (!existingTimelock) {
        throw createUserError(`Timelock not found for network ${network}`,);
    }

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

    if (!currentAuthority.equals(existingTimelock)) {
        throw createUserError(`Current authority is not the timelock, it's ${currentAuthority.toBase58()}`);
    }

    const multisigData = await getMultisigInfo(provider.connection, existingTimelock);

    const member = multisigData.members[0].key;

    const instructions: TransactionInstruction[] = [];

    if (additionalBytes > 0) {
        instructions.push(getExtendProgramInstructionIx({
            programId,
            programDataPda,
            additionalBytes,
            payer: member,
        }));
    }

    instructions.push(getUpgradeInstructionIx({
        programId,
        programDataPda,
        bufferAccount,
        spillAccount: payer.publicKey,
        authority: existingTimelock,
    }));

    const { tx, newTransactionIndex } = await sendTxWithTimelock(common.provider.connection, {
        instructions,
        timelock: existingTimelock,
        signer: payer.publicKey,
        action: { type: 'create' },
    });

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'update-timelock',
        comment: `Propose upgrade of ${program} program trough the timelock. Tx index: ${newTransactionIndex?.toString()}`,
        waitForTx: false,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

    if (newTransactionIndex !== undefined) {
        console.log(`Timelock transaction index: ${newTransactionIndex.toString()}`);
    }

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
