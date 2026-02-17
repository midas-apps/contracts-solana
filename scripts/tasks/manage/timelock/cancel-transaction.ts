
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import { getAuthority, getMultisigTxIndex, getNetwork, getProgram } from '@/scripts/utils/argumentParser';
import { PublicKey, Transaction } from '@solana/web3.js';
import { programAddresses } from '@/common/programs';
import { LOADER_V3_PROGRAM_ADDRESS } from '@solana-program/loader-v3';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getSetAuthorityInstructionIx } from '@/scripts/utils/loaderProgramHelpers';
import * as multisig from "@sqds/multisig";

async function main(
    provider: AnchorProvider,
    payer: Wallet,
    network: string,
) {
    const multisigTxIndex = getMultisigTxIndex();

    console.log(`Cancelling transaction ${multisigTxIndex} on network ${network}`);

    const common = { provider, payer, network };


    const timelock = getTimelockAddress(network);

    if (!timelock) {
        throw createUserError(`Timelock not found for network ${network}`,);
    }


    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(common.provider.connection as any, timelock);

    const tx = new Transaction().add(
        multisig.instructions.proposalCancel({
            multisigPda: timelock,
            transactionIndex: BigInt(multisigTxIndex),
            member: payer.publicKey,
        }),
        multisig.instructions.vaultTransactionAccountsClose({
            multisigPda: timelock,
            transactionIndex: BigInt(multisigTxIndex),
            rentCollector: multisigInfo.rentCollector,
        }),
    );

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'update-timelock',
        comment: `Cancel timelock transaction ${multisigTxIndex} on network ${network}`,
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
