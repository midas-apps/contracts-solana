import { AccountMeta, AddressLookupTableAccount, Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { CommonParams } from './dataFeed';
import * as multisig from "@sqds/multisig";
import { Wallet } from '@coral-xyz/anchor';

export interface DeployTimelockConfig {
    delay: number;
    member: PublicKey;
    createKey?: Keypair;
}

export const getMultisigInfo = async <T extends boolean = true>(connection: Connection, multisigPda: PublicKey, required?: T): Promise<T extends true ? multisig.accounts.Multisig : multisig.accounts.Multisig | null> => {
    required ??= true as T;
    return await multisig.accounts.Multisig.fromAccountAddress(
        connection as any,
        multisigPda
    ).catch(err => {
        if (required) {
            throw err;
        }

        if (err instanceof Error && err.message.includes('Unable to find Multisig account at') || err.message.includes('Expected  to hold a COption')) {
            return null;
        }

        throw err;
    });
}

export const wrapTxWithSquadsSigner = async (connection: Connection, {
    instructions,
    multisigSignerPda,
    addressLookupTableAccounts,
    member,
}: {
    instructions: TransactionInstruction[],
    addressLookupTableAccounts?: AddressLookupTableAccount[],
    multisigSignerPda: PublicKey,
    member: PublicKey
}) => {
    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: multisigSignerPda,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        connection as any,
        multisigSignerPda
    );
    // Get the updated transaction index
    const newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

    const [proposalPda] = multisig.getProposalPda({
        multisigPda: multisigSignerPda,
        transactionIndex: newTransactionIndex,
        programId: multisig.PROGRAM_ID,
    });

    const [transactionPda] = multisig.getTransactionPda({
        multisigPda: multisigSignerPda,
        index: newTransactionIndex,
        programId: multisig.PROGRAM_ID,
    });

    const txMessage = new TransactionMessage({
        payerKey: vaultPda,
        recentBlockhash: await connection.getLatestBlockhash().then(v => v.blockhash),
        instructions: instructions,
    });

    const tx = new Transaction().add(
        multisig.instructions.vaultTransactionCreate({
            multisigPda: multisigSignerPda,
            transactionIndex: newTransactionIndex,
            rentPayer: member,
            creator: member,
            vaultIndex: 0,
            ephemeralSigners: 0,
            transactionMessage: txMessage as any,
            addressLookupTableAccounts,
        }),
        multisig.instructions.proposalCreate({
            multisigPda: multisigSignerPda,
            transactionIndex: newTransactionIndex,
            creator: member,
            rentPayer: member,
        }),
        multisig.instructions.proposalApprove({
            multisigPda: multisigSignerPda,
            transactionIndex: newTransactionIndex,
            member: member,
        }),
    );

    const messageBytes = multisig.utils.transactionMessageToMultisigTransactionMessageBytes({
        message: txMessage as any,
        addressLookupTableAccounts,
        vaultPda,
    });

    const [messageDecoded] = multisig.types.transactionMessageBeet.deserialize(Buffer.from(messageBytes));

    const { accountMetas, lookupTableAccounts } =
        await multisig.utils.accountsForTransactionExecute({
            connection: connection as any,
            message: {
                numSigners: messageDecoded.numSigners,
                numWritableSigners: messageDecoded.numWritableSigners,
                numWritableNonSigners: messageDecoded.numWritableNonSigners,
                accountKeys: messageDecoded.accountKeys,
                instructions: messageDecoded.instructions.map((instruction) => {
                    return {
                        programIdIndex: instruction.programIdIndex,
                        accountIndexes: new Uint8Array(instruction.accountIndexes),
                        data: new Uint8Array(instruction.data),
                    };
                }),
                addressTableLookups: messageDecoded.addressTableLookups.map((lookup) => {
                    return {
                        accountKey: lookup.accountKey,
                        writableIndexes: new Uint8Array(lookup.writableIndexes),
                        readonlyIndexes: new Uint8Array(lookup.readonlyIndexes),
                    };
                }),
            },
            ephemeralSignerBumps: [],
            vaultPda,
            transactionPda,
            programId: multisig.PROGRAM_ID,
        });

    const res = {
        instruction: multisig.generated.createVaultTransactionExecuteInstruction(
            {
                multisig: multisigSignerPda,
                member: member,
                proposal: proposalPda,
                transaction: transactionPda,
                anchorRemainingAccounts: accountMetas,
            },
            multisig.PROGRAM_ID
        ),
        lookupTableAccounts,
    };

    const latestBlockhash = await connection.getLatestBlockhash().then(v => v.blockhash);

    const closeTxInstruction = multisig.instructions.vaultTransactionAccountsClose({
        multisigPda: multisigSignerPda,
        transactionIndex: newTransactionIndex,
        rentCollector: multisigInfo.rentCollector
    });

    const mergeTxs = async () => {
        const instructions = [...tx.instructions, res.instruction, closeTxInstruction];
        const txMessage = new TransactionMessage({
            payerKey: member,
            recentBlockhash: latestBlockhash,
            instructions: instructions,
        });

        return new VersionedTransaction(txMessage.compileToV0Message(res.lookupTableAccounts));
    }

    return mergeTxs();
}

export const sendTxWithTimelock = async (connection: Connection, {
    instructions,
    timelock,
    signer,
    action
}: {
    instructions: TransactionInstruction[];
    timelock: PublicKey;
    signer: PublicKey;
    action: { type: 'create' } | { type: 'execute', transactionIndex: bigint };
}) => {

    const payer = signer;

    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: timelock,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await getMultisigInfo(connection, timelock);

    if (multisigInfo.members.length !== 1) {
        throw new Error('Expected timelock to have only one member, got ' + multisigInfo.members.length);
    }

    const multisigSignerPda = multisigInfo.members[0].key;

    const multisigSignerPdaAccount = await getMultisigInfo(connection, multisigSignerPda, false);

    const squadsSigner = multisigSignerPdaAccount !== null;

    if (squadsSigner) {
        console.log('Timelock member is a squads signer, timelock txs will be wrapped with squads signer');
    }

    const member = squadsSigner ? multisigSignerPda : payer;

    let tx: Transaction | VersionedTransaction;
    let newTransactionIndex: bigint | undefined;

    if (action.type === 'create') {
        // Get the updated transaction index
        // TODO: get the index from the custom signer
        newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

        // Build a message with instructions we want to execute
        const txMessage = new TransactionMessage({
            payerKey: vaultPda,
            recentBlockhash: await connection.getLatestBlockhash().then(v => v.blockhash),
            instructions: instructions,
        });


        const txCreate = new Transaction().add(
            multisig.instructions.vaultTransactionCreate({
                multisigPda: timelock,
                transactionIndex: newTransactionIndex,
                creator: member,
                rentPayer: payer,
                vaultIndex: 0,
                ephemeralSigners: 0,
                transactionMessage: txMessage as any,
            }),
            multisig.instructions.proposalCreate({
                multisigPda: timelock,
                transactionIndex: newTransactionIndex,
                creator: member,
                rentPayer: payer,
            }),
            multisig.instructions.proposalApprove({
                multisigPda: timelock,
                transactionIndex: newTransactionIndex,
                member: member,
            }),
        );

        tx = txCreate;

        if (squadsSigner) {
            tx = await wrapTxWithSquadsSigner(connection, {
                instructions: txCreate.instructions,
                member: payer,
                multisigSignerPda: multisigSignerPda,
            });
        }

    } else {
        const transactionIndex = action.transactionIndex;

        const [proposalPda] = multisig.getProposalPda({
            multisigPda: timelock,
            transactionIndex,
        });
        const createdProposal: multisig.accounts.Proposal | null = await multisig.accounts.Proposal.fromAccountAddress(connection as any, proposalPda).catch(err => {
            if (err instanceof Error && err.message.includes('Unable to find Proposal account at')) {
                return null;
            }
            throw err;
        });

        if (createdProposal === null) {
            throw new Error('Expected proposal to be created, but it was not found');
        }

        if (createdProposal.status.__kind !== 'Approved') {
            throw new Error('Expected proposal to be approved, but the status is ' + createdProposal.status.__kind);
        } else {
            console.log('Proposal is approved, executing transaction');
        }

        const inxExecute = await multisig.instructions.vaultTransactionExecute({
            connection: connection as any,
            multisigPda: timelock,
            member: member,
            transactionIndex,
        })

        tx = new VersionedTransaction(new TransactionMessage({
            payerKey: payer,
            recentBlockhash: await connection.getLatestBlockhash().then(v => v.blockhash),
            instructions: [inxExecute.instruction],
        }).compileToV0Message(inxExecute.lookupTableAccounts));

        if (squadsSigner) {
            tx = await wrapTxWithSquadsSigner(connection, {
                instructions: [inxExecute.instruction],
                member: payer,
                multisigSignerPda: multisigSignerPda,
                addressLookupTableAccounts: inxExecute.lookupTableAccounts,
            });
        }
    }

    return { tx, newTransactionIndex };
}

export const getTimelockTransaction = async (connection: Connection, {
    timelock,
    transactionIndex
}: {
    timelock: PublicKey;
    transactionIndex: bigint;
}) => {

    const [transactionPda] = multisig.getTransactionPda({
        multisigPda: timelock,
        index: transactionIndex,
    });

    const transaction: multisig.accounts.VaultTransaction | null = await multisig.accounts.VaultTransaction.fromAccountAddress(connection as any, transactionPda).catch(err => {
        if (err instanceof Error && err.message.includes('Unable to find VaultTransaction account at')) {
            return null;
        }
        throw err;
    });

    const [proposalPda] = multisig.getProposalPda({
        multisigPda: timelock,
        transactionIndex: transactionIndex,
    });

    const proposal: multisig.accounts.Proposal | null = await multisig.accounts.Proposal.fromAccountAddress(connection as any, proposalPda).catch(err => {
        if (err instanceof Error && err.message.includes('Unable to find Proposal account at')) {
            return null;
        }
        throw err;
    });

    return { proposal, transaction };
};

export function createMultisigCreateV2Instruction(
    accounts: multisig.generated.MultisigCreateV2InstructionAccounts,
    args: multisig.generated.MultisigCreateV2InstructionArgs
) {
    const [data] = multisig.generated.multisigCreateV2Struct.serialize({
        instructionDiscriminator: multisig.generated.multisigCreateV2InstructionDiscriminator,
        ...args,
    })
    const keys: AccountMeta[] = [
        {
            pubkey: accounts.programConfig,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: accounts.treasury,
            isWritable: true,
            isSigner: false,
        },
        {
            pubkey: accounts.multisig,
            isWritable: true,
            isSigner: false,
        },
        {
            pubkey: accounts.createKey,
            isWritable: true,
            isSigner: true,
        },
        {
            pubkey: accounts.creator,
            isWritable: true,
            isSigner: true,
        },
        {
            pubkey: accounts.systemProgram ?? SystemProgram.programId,
            isWritable: false,
            isSigner: false,
        },
    ]

    if (accounts.anchorRemainingAccounts != null) {
        for (const acc of accounts.anchorRemainingAccounts) {
            keys.push(acc)
        }
    }

    const ix = new TransactionInstruction({
        programId: multisig.PROGRAM_ID,
        keys,
        data,
    })
    return ix
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

    const tx = new Transaction().add(createMultisigCreateV2Instruction({
        programConfig: programConfigPda,
        treasury: configTreasury,
        multisig: multisigPda,
        createKey: createKey.publicKey,
        creator: common.payer.publicKey,
    }, {
        args: {
            configAuthority: null,
            threshold: 1,
            members: [{
                key: member,
                permissions: multisig.types.Permissions.all(),
            }],
            timeLock: Number(delay),
            rentCollector: common.payer.publicKey,
            memo: null,
        },
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


    const [vaultPda] = multisig.getVaultPda({
        multisigPda: multisigPda,
        index: 0,
    });

    return {
        multisig: multisigPda as PublicKey,
        vault: vaultPda as PublicKey,
    };
};

