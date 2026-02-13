import { instructions } from "@sqds/multisig";
import { SquadsFixtureReturnType } from "../fixture/squads.fixture";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { expectTxNotReverted, expectTxReverted, OptionalCommonParams, timeTravel } from "../helpers/common.helpers";
import * as multisig from "@sqds/multisig";
import { DAY } from "../constants/common.constants";



export const sendSquadsTxWithTimelock = async (fixture: SquadsFixtureReturnType, {
    waitForTimelock = true,
    instructions,
}: {
    instructions: TransactionInstruction[];
    waitForTimelock?: boolean;
}, opt?: {
    revertedWithCreate?: string;
    revertedWithExecute?: string;
    fromCreate?: Keypair;
    fromExecute?: Keypair;
}) => {
    const { mutlisigPda, getMutlisigData, authority, squadsConnection } = fixture;

    const fromCreate = opt?.fromCreate ?? authority;
    const fromExecute = opt?.fromExecute ?? authority;

    // Derive the PDA of the Squads Vault
    const [vaultPda] = multisig.getVaultPda({
        multisigPda: mutlisigPda as any,
        index: 0,
    });

    // Get deserialized multisig account info
    const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        squadsConnection,
        mutlisigPda as any
    );
    // Get the updated transaction index
    const newTransactionIndex = BigInt(multisigInfo.transactionIndex.toString()) + 1n;

    // Build a message with instructions we want to execute
    const txMessage = new TransactionMessage({
        payerKey: vaultPda,
        recentBlockhash: fixture.context.lastBlockhash,
        instructions: instructions,
    });

    const txCreate = new Transaction().add(
        multisig.instructions.vaultTransactionCreate({
            multisigPda: mutlisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: fromCreate.publicKey,
            vaultIndex: 0,
            ephemeralSigners: 0,
            transactionMessage: txMessage as any,
        }),
        multisig.instructions.proposalCreate({
            multisigPda: mutlisigPda as any,
            transactionIndex: newTransactionIndex,
            creator: fromCreate.publicKey,
        }),
        multisig.instructions.proposalApprove({
            multisigPda: mutlisigPda as any,
            transactionIndex: newTransactionIndex,
            member: fromCreate.publicKey,

        }),
    );

    if (opt?.revertedWithCreate !== undefined) {
        await expectTxReverted(fixture.context, txCreate, [fromCreate], {
            revertedWith: opt.revertedWithCreate,
        });
        return;
    }

    await expectTxNotReverted(fixture.context, txCreate, [fromCreate]);

    const [proposalPda] = multisig.getProposalPda({
        multisigPda: mutlisigPda as any,
        transactionIndex: newTransactionIndex,
    });
    const createdProposal = await multisig.accounts.Proposal.fromAccountAddress(squadsConnection, proposalPda);

    expect(createdProposal.status.__kind).toBe('Approved');

    const inxExecute = await multisig.instructions.vaultTransactionExecute({
        connection: squadsConnection,
        multisigPda: mutlisigPda as any,
        member: fromExecute.publicKey,
        transactionIndex: newTransactionIndex,
    })

    const txExecute = new VersionedTransaction(new TransactionMessage({
        payerKey: fromExecute.publicKey,
        recentBlockhash: fixture.context.lastBlockhash,
        instructions: [inxExecute.instruction],
    }).compileToV0Message(inxExecute.lookupTableAccounts));


    if (waitForTimelock) {
        const currentTime = await fixture.context.banksClient.getClock().then(clock => clock.unixTimestamp);
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

    await expectTxNotReverted(fixture.context, txExecute, [fromExecute]);

}