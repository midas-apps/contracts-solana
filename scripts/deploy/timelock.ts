import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { CommonParams } from './dataFeed';
import * as multisig from "@sqds/multisig";

export interface DeployTimelockConfig {
    delay: number;
    member: PublicKey;
    createKey?: Keypair;
}

export const deployTimelock = async (common: CommonParams, { delay, member, createKey }: DeployTimelockConfig) => {
    createKey ??= Keypair.generate();
    const [multisigPda] = multisig.getMultisigPda({
        createKey: createKey.publicKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];

    const programConfig =
        await multisig.accounts.ProgramConfig.fromAccountAddress(
            common.provider.connection as any,
            programConfigPda
        );

    const configTreasury = programConfig.treasury;

    const tx = new Transaction().add(multisig.instructions.multisigCreateV2({
        // Must sign the transaction, unless the .rpc method is used.
        createKey: createKey.publicKey,
        // The creator & fee payer
        creator: common.payer.publicKey,
        // The PDA of the multisig you are creating, derived by a random PublicKey
        multisigPda,
        // Here the config authority will be the system program
        configAuthority: null,
        // Create without any time-lock
        timeLock: Number(delay),
        // List of the members to add to the multisig
        members: [{
            // Members Public Key
            key: member,
            // Granted Proposer, Voter, and Executor permissions
            permissions: multisig.types.Permissions.all(),
        }],
        // This means that there needs to be 2 votes for a transaction proposal to be approved
        threshold: 1,
        // This is for the program config treasury account
        treasury: configTreasury,
        // Rent reclaim account
        rentCollector: member
    }));

    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [createKey], {
        action: 'deployer',
        comment: 'Deploy Timelock',
        waitForTx: true,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

    if (result.signature) {
        console.log(`Transaction signature: ${result.signature}`);
    }

    return multisigPda as PublicKey;
};

