import { SquadsFixtureReturnType } from "../fixture/squads.fixture";
import { AddressLookupTableAccount, Keypair, PublicKey, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { expectTxNotReverted, expectTxReverted, getTime, timeTravel } from "../helpers/common.helpers";
import * as multisig from "@sqds/multisig";
import { DAY } from "../constants/common.constants";


const wrapTxWithSquadsSigner = async (fixture: SquadsFixtureReturnType, {
    instructions,
    member,
    addressLookupTableAccounts,
    payer
}: {
    instructions: TransactionInstruction[],
    addressLookupTableAccounts?: AddressLookupTableAccount[],
    member: PublicKey,
    payer: PublicKey
}) => {
    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: fixture.multisigSignerPda as any,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.squadsConnection,
        fixture.multisigSignerPda as any
    );
    // Get the updated transaction index
    const newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

    const txMessage = new TransactionMessage({
        payerKey: vaultPda,
        recentBlockhash: fixture.context.latestBlockhash(),
        instructions: instructions,
    });

    const tx = new Transaction().add(
        multisig.instructions.vaultTransactionCreate({
            multisigPda: fixture.multisigSignerPda as any,
            transactionIndex: newTransactionIndex,
            creator: member,
            vaultIndex: 0,
            ephemeralSigners: 0,
            transactionMessage: txMessage as any,
            addressLookupTableAccounts,
        }),
        multisig.instructions.proposalCreate({
            multisigPda: fixture.multisigSignerPda as any,
            transactionIndex: newTransactionIndex,
            creator: member,
        }),
        multisig.instructions.proposalApprove({
            multisigPda: fixture.multisigSignerPda as any,
            transactionIndex: newTransactionIndex,
            member,
        }),
    );

    const getTxExecute = async () => {
        const { instruction, lookupTableAccounts } = await multisig.instructions.vaultTransactionExecute({
            multisigPda: fixture.multisigSignerPda as any,
            member,
            transactionIndex: newTransactionIndex,
            connection: fixture.squadsConnection,
        });

        const txExecute = new VersionedTransaction(new TransactionMessage({
            payerKey: payer,
            recentBlockhash: fixture.context.latestBlockhash(),
            instructions: [instruction],
        }).compileToV0Message(lookupTableAccounts));

        return txExecute;
    }


    return { txCreate: tx, getTxExecute };
}

export const sendSquadsTxWithTimelock = async (fixture: SquadsFixtureReturnType, {
    waitForTimelock = true,
    instructions,
    multisigPda,
}: {
    instructions: TransactionInstruction[];
    waitForTimelock?: boolean;
    multisigPda?: PublicKey;
}, opt?: {
    revertedWithCreate?: string;
    revertedWithExecute?: string;
    fromCreate?: Keypair;
    fromExecute?: Keypair;
}) => {
    const { multisigPda: defaultMultisigPda, multisigWithSquadsSignerPda, multisigSignerPda, getMutlisigData, authority, squadsConnection } = fixture;

    const fromCreate = opt?.fromCreate ?? authority;
    const fromExecute = opt?.fromExecute ?? authority;


    multisigPda ??= defaultMultisigPda;

    const squadsSigner = multisigPda.equals(defaultMultisigPda) ? false : true;

    const memberCreate = squadsSigner ? multisigSignerPda : fromCreate.publicKey;
    const memberExecute = squadsSigner ? multisigSignerPda : fromExecute.publicKey;

    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: multisigPda as any,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        squadsConnection,
        multisigPda as any
    );
    // Get the updated transaction index
    const newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

    // Build a message with instructions we want to execute
    const txMessage = new TransactionMessage({
        payerKey: vaultPda,
        recentBlockhash: fixture.context.latestBlockhash(),
        instructions: instructions,
    });


    let txCreate = new Transaction().add(
        multisig.instructions.vaultTransactionCreate({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: memberCreate,
            rentPayer: fromCreate.publicKey,
            vaultIndex: 0,
            ephemeralSigners: 0,
            transactionMessage: txMessage as any,
        }),
        multisig.instructions.proposalCreate({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: memberCreate,
            rentPayer: fromCreate.publicKey,
        }),
        multisig.instructions.proposalApprove({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            member: memberCreate,
        }),
    );

    let getTxCreateExecute: () => Promise<VersionedTransaction>;

    if (squadsSigner) {
        const res = await wrapTxWithSquadsSigner(fixture, {
            instructions: txCreate.instructions,
            member: fromCreate.publicKey,
            payer: fromCreate.publicKey,
        });

        txCreate = res.txCreate;
        getTxCreateExecute = res.getTxExecute;
    }

    if (opt?.revertedWithCreate !== undefined) {
        await expectTxReverted(fixture.context, txCreate, [authority, fromCreate], {
            revertedWith: opt.revertedWithCreate,
        });
        return;
    }

    await expectTxNotReverted(fixture.context, txCreate, [authority, fromCreate]);

    if (getTxCreateExecute) {
        const txCreateExecute = await getTxCreateExecute();
        await expectTxNotReverted(fixture.context, txCreateExecute, [authority, fromCreate]);

    }

    const [proposalPda] = multisig.getProposalPda({
        multisigPda: multisigPda as any,
        transactionIndex: newTransactionIndex,
    });
    const createdProposal = await multisig.accounts.Proposal.fromAccountAddress(squadsConnection, proposalPda);

    expect(createdProposal.status.__kind).toBe('Approved');

    const inxExecute = await multisig.instructions.vaultTransactionExecute({
        connection: squadsConnection,
        multisigPda: multisigPda as any,
        member: memberExecute,
        transactionIndex: newTransactionIndex,
    })

    let txExecute: Transaction | VersionedTransaction = new VersionedTransaction(new TransactionMessage({
        payerKey: fromExecute.publicKey,
        recentBlockhash: fixture.context.latestBlockhash(),
        instructions: [inxExecute.instruction],
    }).compileToV0Message(inxExecute.lookupTableAccounts));

    let getTxExecuteExecute: () => Promise<VersionedTransaction>;

    if (squadsSigner) {
        const res = await wrapTxWithSquadsSigner(fixture, {
            instructions: [inxExecute.instruction],
            addressLookupTableAccounts: inxExecute.lookupTableAccounts,
            member: fromExecute.publicKey,
            payer: fromExecute.publicKey,
        });

        txExecute = res.txCreate;
        getTxExecuteExecute = res.getTxExecute;
    }

    if (waitForTimelock) {
        const currentTime = await getTime(fixture.context);
        const txApprovedAt = BigInt(createdProposal.status.__kind === 'Approved' ? createdProposal.status.timestamp.toString() : 0);
        const timelockDuration = 2n * DAY;
        const timelockEndsAt = txApprovedAt + timelockDuration;
        const deltaTime = timelockEndsAt - BigInt(currentTime);
        await timeTravel(fixture.context, deltaTime);
    }


    if (opt?.revertedWithExecute !== undefined) {
        await expectTxReverted(fixture.context, txExecute, [fromExecute], {
            revertedWith: opt.revertedWithExecute,
        });
        return;
    }

    await expectTxNotReverted(fixture.context, txExecute, [authority, fromExecute]);

    if (getTxExecuteExecute) {
        const txExecuteExecute = await getTxExecuteExecute();
        await expectTxNotReverted(fixture.context, txExecuteExecute, [authority, fromExecute]);
    }

    const proposalStatusAfter = await multisig.accounts.Proposal.fromAccountAddress(squadsConnection, proposalPda);
    expect(proposalStatusAfter.status.__kind).toBe('Executed');
}

export const sendSquadsConfigurationTxWithTimelock = async (fixture: SquadsFixtureReturnType, {
    waitForTimelock = true,
    actions,
    multisigPda,
}: {
    actions: multisig.types.ConfigAction[];
    waitForTimelock?: boolean;
    multisigPda?: PublicKey;
}, opt?: {
    revertedWithCreate?: string;
    revertedWithExecute?: string;
    fromCreate?: Keypair;
    fromExecute?: Keypair;
}) => {
    const { multisigPda: defaultMultisigPda, multisigSignerPda, getMutlisigData, authority, squadsConnection } = fixture;

    const fromCreate = opt?.fromCreate ?? authority;
    const fromExecute = opt?.fromExecute ?? authority;


    multisigPda ??= defaultMultisigPda;

    const squadsSigner = multisigPda.equals(defaultMultisigPda) ? false : true;

    const member = squadsSigner ? multisigSignerPda : authority.publicKey;

    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: multisigPda as any,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        squadsConnection,
        multisigPda as any
    );
    // Get the updated transaction index
    const newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

    let txCreate = new Transaction().add(
        multisig.instructions.configTransactionCreate({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: member,
            rentPayer: fromCreate.publicKey,
            actions,
        }),
        multisig.instructions.proposalCreate({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: member,
            rentPayer: fromCreate.publicKey,
        }),
        multisig.instructions.proposalApprove({
            multisigPda: multisigPda as any,
            transactionIndex: newTransactionIndex,
            member,
        }),
    );

    let getTxCreateExecute: () => Promise<VersionedTransaction>;

    if (squadsSigner) {
        const res = await wrapTxWithSquadsSigner(fixture, {
            instructions: txCreate.instructions,
            member: fromCreate.publicKey,
            payer: fromCreate.publicKey,
        });

        txCreate = res.txCreate;
        getTxCreateExecute = res.getTxExecute;
    }

    if (opt?.revertedWithCreate !== undefined) {
        await expectTxReverted(fixture.context, txCreate, [authority, fromCreate], {
            revertedWith: opt.revertedWithCreate,
        });
        return;
    }

    await expectTxNotReverted(fixture.context, txCreate, [authority, fromCreate]);

    if (getTxCreateExecute) {
        const txCreateExecute = await getTxCreateExecute();
        await expectTxNotReverted(fixture.context, txCreateExecute, [authority, fromCreate]);

    }

    const [proposalPda] = multisig.getProposalPda({
        multisigPda: multisigPda as any,
        transactionIndex: newTransactionIndex,
    });
    const createdProposal = await multisig.accounts.Proposal.fromAccountAddress(squadsConnection, proposalPda);

    expect(createdProposal.status.__kind).toBe('Approved');


    if (waitForTimelock) {
        const currentTime = await getTime(fixture.context);
        const txApprovedAt = BigInt(createdProposal.status.__kind === 'Approved' ? createdProposal.status.timestamp.toString() : 0);
        const timelockDuration = 2n * DAY;
        const timelockEndsAt = txApprovedAt + timelockDuration;
        const deltaTime = timelockEndsAt - BigInt(currentTime);
        await timeTravel(fixture.context, deltaTime + 1n);
    }


    const inxExecute = multisig.instructions.configTransactionExecute({
        multisigPda: multisigPda as any,
        member,
        transactionIndex: newTransactionIndex,
    })

    let txExecute = new Transaction().add(inxExecute);

    let getTxExecuteExecute: () => Promise<VersionedTransaction>;

    if (squadsSigner) {
        const res = await wrapTxWithSquadsSigner(fixture, {
            instructions: txExecute.instructions,
            member: fromExecute.publicKey,
            payer: fromExecute.publicKey,
        });

        txExecute = res.txCreate;
        getTxExecuteExecute = res.getTxExecute;
    }


    if (opt?.revertedWithExecute !== undefined) {
        await expectTxReverted(fixture.context, txExecute, [authority, fromExecute], {
            revertedWith: opt.revertedWithExecute,
        });
        return;
    }

    await expectTxNotReverted(fixture.context, txExecute, [authority, fromExecute]);

    if (getTxExecuteExecute) {
        const txExecuteExecute = await getTxExecuteExecute();
        await expectTxNotReverted(fixture.context, txExecuteExecute, [authority, fromExecute]);
    }

    const proposalStatusAfter = await multisig.accounts.Proposal.fromAccountAddress(squadsConnection, proposalPda);
    expect(proposalStatusAfter.status.__kind).toBe('Executed');
}