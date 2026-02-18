import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { AccessControl } from 'target/types/access_control';

import ACCESS_CONTROL_IDL from '../../target/idl/access_control.json' with { type: 'json' };
import { AC_ROLES } from '../constants/ac.constants';
import { acRoleToBuffer, generateAcRoleAccount } from '../helpers/ac.helpers';
import { initBankrun, processTransaction } from '../helpers/common.helpers';
import { generateAcAccount } from '../helpers/vaults.helpers';
import { ProgramTestContext } from 'solana-bankrun';
import { DAY } from '../constants/common.constants';
import * as multisig from "@sqds/multisig";
import { SQUADS_PROGRAM_ID } from '../constants/squads.constant';

const createMultisig = async (context: ProgramTestContext, {
    authority,
    timelock = 2n * DAY,
    connection,
    member
}: {
    authority: Keypair,
    member?: PublicKey
    timelock?: bigint;
    connection: any;
}) => {
    const createKey = Keypair.generate();
    const [multisigPda] = multisig.getMultisigPda({
        createKey: createKey.publicKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];

    const programConfig =
        await multisig.accounts.ProgramConfig.fromAccountAddress(
            connection,
            programConfigPda
        );

    const configTreasury = programConfig.treasury;

    await processTransaction(context, new Transaction().add(multisig.instructions.multisigCreateV2({
        // Must sign the transaction, unless the .rpc method is used.
        createKey: createKey.publicKey,
        // The creator & fee payer
        creator: authority.publicKey,
        // The PDA of the multisig you are creating, derived by a random PublicKey
        multisigPda,
        // Here the config authority will be the system program
        configAuthority: null,
        // Create without any time-lock
        timeLock: Number(timelock),
        // List of the members to add to the multisig
        members: [{
            // Members Public Key
            key: member ?? authority.publicKey,
            // Granted Proposer, Voter, and Executor permissions
            permissions: multisig.types.Permissions.all(),
        },

        ],
        // This means that there needs to be 2 votes for a transaction proposal to be approved
        threshold: 1,
        // This is for the program config treasury account
        treasury: configTreasury,
        // Rent reclaim account
        rentCollector: null
    })), [authority, createKey]);

    return multisigPda as PublicKey;

}

export const squadsFixture = async (initSlot?: bigint) => {
    const { provider, context, accounts } = await initBankrun(10, initSlot, true);

    const [authority, ...regularAccounts] = accounts;


    const mockAccounts = [{
        data: Buffer.from('xNJa55CVjD92Raz2HiWPdZHPcd7iP2i7V0ot8H6/wFdsT5Tc2zbKegAAAAAAAAAAPpPXMsRIJCeQ0tu1MaQKvRnxbFXjEyz/UnetydaTq1oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 
            'base64'),
        publicKey: new PublicKey('BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr'),
        owner: SQUADS_PROGRAM_ID,
    }]

    for (const account of mockAccounts) {
        context.setAccount(account.publicKey, {
            data: account.data,
            owner: account.owner,
            lamports: 10000,
            executable: false
        });
    }


    const multisigPda = await createMultisig(context, {
        authority,
        connection: provider.connection,
    });

    const multisigSignerPda = await createMultisig(context, {
        authority,
        connection: provider.connection,
        timelock: 0n
    });

    const multisigWithSquadsSignerPda = await createMultisig(context, {
        authority,
        connection: provider.connection,
        member: multisigSignerPda
    });

    const squadsConnection = provider.connection as any;

    return {
        provider,
        context,
        authority,
        multisigPda,
        regularAccounts,
        squadsConnection,
        accounts,
        multisigSignerPda,
        multisigWithSquadsSignerPda,
        getMutlisigData: async (pda?: PublicKey) => {
            return await multisig.accounts.Multisig.fromAccountAddress(
                squadsConnection,
                pda ?? multisigPda
            );
        }
    };
};

export type SquadsFixtureReturnType = Awaited<ReturnType<typeof squadsFixture>>;
