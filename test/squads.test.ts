import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { DAY } from "./constants/common.constants";
import { squadsFixture } from "./fixture/squads.fixture";
import { sendSquadsConfigurationTxWithTimelock, sendSquadsTxWithTimelock } from "./testers/squads.testers";
import * as multisig from "@sqds/multisig";
import { processTransaction } from "./helpers/common.helpers";
import { acFixture } from "./fixture/ac.fixture";
import { grantRole } from "./testers/ac.testers";
import { AC_ROLES } from "./constants/ac.constants";
import { acRoleToBuffer } from "./helpers/ac.helpers";

describe('Squads multisig', () => {
    describe('initializing', () => {
        it('should create multisig', async () => {
            const { getMutlisigData, authority } = await squadsFixture();
            const data = await getMutlisigData();
            expect(data.members.length).toBe(1);
            expect(data.members[0].key.equals(authority.publicKey)).toBe(true);
            expect(data.threshold).toBe(1);
            expect(data.timeLock).toBe(Number(2n * DAY));
        });
    });

    describe('timelock', () => {
        describe('config transactions', () => {
            it('change the timelock configuration when timelock is passed', async () => {
                const fixture = await squadsFixture();

                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);

                await sendSquadsConfigurationTxWithTimelock(fixture, {
                    actions: [{
                        __kind: 'SetTimeLock',
                        newTimeLock: 0
                    }],
                });

                const data = await getMutlisigData();
                expect(data.timeLock).toBe(0);
            });

            it('change the members configuration when timelock is passed', async () => {
                const fixture = await squadsFixture();

                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);

                await sendSquadsConfigurationTxWithTimelock(fixture, {
                    actions: [{
                        __kind: 'SetRentCollector',
                        newRentCollector: regularAccounts[1].publicKey,
                    }],
                });

                const data = await getMutlisigData();
                expect(data.rentCollector.equals(regularAccounts[1].publicKey)).toBe(true);
            });


            it('should fail: change the timelock configuration when timelock is not passed', async () => {
                const fixture = await squadsFixture();

                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);

                await sendSquadsConfigurationTxWithTimelock(fixture, {
                    actions: [{
                        __kind: 'SetTimeLock',
                        newTimeLock: 0
                    }],
                    waitForTimelock: false
                }, {
                    revertedWithExecute: '0x1785',
                });
            });

            it('should fail: change the members configuration when timelock is not passed', async () => {
                const fixture = await squadsFixture();

                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);

                await sendSquadsConfigurationTxWithTimelock(fixture, {
                    actions: [{
                        __kind: 'AddMember',
                        newMember: {
                            key: regularAccounts[1].publicKey,
                            permissions: multisig.types.Permissions.all(),
                        }
                    }],
                    waitForTimelock: false
                }, {
                    revertedWithExecute: '0x1785',
                });
            });
        });

        describe('vault transactions', () => {
            it('regular sol transfer with timelock', async () => {
                const fixture = await squadsFixture();
                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);


                const instructions = [
                    SystemProgram.transfer({
                        fromPubkey: vaultPda,
                        toPubkey: regularAccounts[0].publicKey,
                        lamports: LAMPORTS_PER_SOL,
                    }),
                ];

                await sendSquadsTxWithTimelock(fixture, {
                    instructions,
                });
            });

            it('custom instruction with timelock', async () => {
                const fixture = await squadsFixture();
                const fixtureAc = await acFixture(fixture);

                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });


                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);

                await grantRole(fixtureAc, {
                    account: vaultPda,
                    acRole: fixtureAc.acRoleGlobal.publicKey,
                    role: AC_ROLES.ADMIN,
                });


                const instructions = [
                    await fixtureAc.acProgram.methods.grantRole(acRoleToBuffer(AC_ROLES.UPDATE_ACCOUNT_AC))
                        .accounts({
                            acRole: fixtureAc.acRoleGlobal.publicKey,
                            authority: vaultPda,
                            account: regularAccounts[0].publicKey,
                        })
                        .instruction(),
                ];

                await sendSquadsTxWithTimelock(fixture, {
                    instructions,
                });
            });


            it('should fail: sol transfer but timelock is not passed', async () => {
                const fixture = await squadsFixture();
                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);


                const instructions = [
                    SystemProgram.transfer({
                        fromPubkey: vaultPda,
                        toPubkey: regularAccounts[0].publicKey,
                        lamports: LAMPORTS_PER_SOL,
                    }),
                ];

                await sendSquadsTxWithTimelock(fixture, {
                    instructions,
                    waitForTimelock: false,
                }, {
                    revertedWithExecute: '0x1785',
                });
            });

            it('should fail: sol transfer create from non-member', async () => {
                const fixture = await squadsFixture();
                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);


                const instructions = [
                    SystemProgram.transfer({
                        fromPubkey: vaultPda,
                        toPubkey: regularAccounts[0].publicKey,
                        lamports: LAMPORTS_PER_SOL,
                    }),
                ];

                await sendSquadsTxWithTimelock(fixture, {
                    instructions,
                }, {
                    revertedWithCreate: '0x1775',
                    fromCreate: regularAccounts[1],
                });
            });

            it('should fail: sol transfer execute from non-member', async () => {
                const fixture = await squadsFixture();
                const { multisigPda, getMutlisigData, authority, regularAccounts, context } = fixture;

                const [vaultPda] = multisig.getVaultPda({
                    multisigPda: multisigPda as any,
                    index: 0,
                });

                await processTransaction(context,
                    new Transaction().add(SystemProgram.transfer({
                        fromPubkey: authority.publicKey,
                        toPubkey: vaultPda,
                        lamports: LAMPORTS_PER_SOL,
                    })), [authority]);


                const instructions = [
                    SystemProgram.transfer({
                        fromPubkey: vaultPda,
                        toPubkey: regularAccounts[0].publicKey,
                        lamports: LAMPORTS_PER_SOL,
                    }),
                ];

                await sendSquadsTxWithTimelock(fixture, {
                    instructions,
                }, {
                    revertedWithExecute: '0x1775',
                    fromExecute: regularAccounts[1],
                });
            });
        });

    });

    describe('squads member', () => {
        it('should create and execute tx with squads member', async () => {
            const fixture = await squadsFixture();
            const { multisigWithSquadsSignerPda, multisigSignerPda, getMutlisigData, authority, regularAccounts, context } = fixture;

            const [vaultPda] = multisig.getVaultPda({
                multisigPda: multisigWithSquadsSignerPda as any,
                index: 0,
            });

            await processTransaction(context,
                new Transaction().add(SystemProgram.transfer({
                    fromPubkey: authority.publicKey,
                    toPubkey: vaultPda,
                    lamports: LAMPORTS_PER_SOL,
                })), [authority]);

            await processTransaction(context,
                new Transaction().add(SystemProgram.transfer({
                    fromPubkey: authority.publicKey,
                    toPubkey: multisigSignerPda,
                    lamports: LAMPORTS_PER_SOL,
                })), [authority]);


            const instructions = [
                SystemProgram.transfer({
                    fromPubkey: vaultPda,
                    toPubkey: regularAccounts[0].publicKey,
                    lamports: LAMPORTS_PER_SOL,
                }),
            ];

            await sendSquadsTxWithTimelock(fixture, {
                instructions,
                multisigPda: multisigWithSquadsSignerPda,
            });
        });
    });
})