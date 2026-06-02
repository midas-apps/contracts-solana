
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import { getMultisigTxIndex, getNetwork } from '@/scripts/utils/argumentParser';
import { Transaction } from '@solana/web3.js';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import * as multisig from "@sqds/multisig";
import { getMultisigInfo, wrapTxWithSquadsSigner } from '@/scripts/deploy/timelock';

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

    const multisigInfo = await getMultisigInfo(common.provider.connection, timelock.multisig);

    const multisigMember = multisigInfo.members[0].key;
    const memberMultisigInfo = await getMultisigInfo(common.provider.connection, multisigMember, false);

    const inxs = [
        multisig.instructions.proposalCancel({
            multisigPda: timelock.multisig,
            transactionIndex: BigInt(multisigTxIndex),
            member: payer.publicKey,
        }),
        multisig.instructions.vaultTransactionAccountsClose({
            multisigPda: timelock.multisig,
            transactionIndex: BigInt(multisigTxIndex),
            rentCollector: multisigInfo.rentCollector,
        }),
    ]

    const tx = memberMultisigInfo ?
        await wrapTxWithSquadsSigner(
            common.provider.connection,
            {
                instructions: inxs,
                member: payer.publicKey,
                multisigSignerPda: multisigMember
            })
        : new Transaction().add(...inxs);

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'update-timelock',
        comment: `Cancel timelock transaction ${multisigTxIndex} on network ${network}`,
        waitForTx: false,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

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
