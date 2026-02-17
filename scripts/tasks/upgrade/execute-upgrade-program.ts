
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import {  getMultisigTxIndex, getNetwork } from '@/scripts/utils/argumentParser';
import { programAddresses } from '@/common/programs';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getTimelockTransaction, sendTxWithTimelock } from '@/scripts/deploy/timelock';

async function main(
    provider: AnchorProvider,
    payer: Wallet,
    network: string
) {
    const multisigTxIndex = getMultisigTxIndex();

    console.log(`Executing program upgrade trough the timelock for: ${network}`);

    const existingTimelock = getTimelockAddress(network);
    if (!existingTimelock) {
        throw createUserError(`Timelock not found for network ${network}`,);
    }

    const common = { provider, payer, network };

    const { transaction, proposal } = await getTimelockTransaction(common.provider.connection, {
        timelock: existingTimelock,
        transactionIndex: BigInt(multisigTxIndex),
    });

    if (!transaction || !proposal) {
        throw createUserError(`Transaction or proposal not found for multisig tx index ${multisigTxIndex}. Its either not created or already executed`,);
    }

    if (proposal.status.__kind !== 'Approved') {
        throw createUserError(`Proposal is not approved for multisig tx index ${multisigTxIndex}`,);
    }

    const programIdIndex = transaction.message.instructions[0].accountIndexes[1];
    const bufferIndex = transaction.message.instructions[0].accountIndexes[2];

    const programId = transaction.message.accountKeys[programIdIndex];
    const buffer = transaction.message.accountKeys[bufferIndex];

    console.log(`Program id: ${programId.toBase58()}`);
    console.log(`Buffer: ${buffer.toBase58()}`);

    const program = Object.keys(programAddresses).find(key => programAddresses[key as keyof typeof programAddresses].equals(programId));

    if (!program) {
        throw createUserError(`Program id ${programId.toBase58()} not found in program addresses`,);
    }

    console.log(`Program: ${program}`);

    const tx = await sendTxWithTimelock(common.provider.connection, {
        instructions: [],
        timelock: existingTimelock,
        signer: payer.publicKey,
        action: { type: 'execute', transactionIndex: BigInt(multisigTxIndex) },
    });

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'update-timelock',
        comment: `Execute upgrade of ${program} program trough the timelock`,
        waitForTx: false,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

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
