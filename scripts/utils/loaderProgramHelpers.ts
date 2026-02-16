import { getSetAuthorityInstruction, getUpgradeInstruction, LOADER_V3_PROGRAM_ADDRESS } from "@solana-program/loader-v3";
import { AccountRole, Address, TransactionSigner } from "@solana/kit";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

export const getSetAuthorityInstructionIx = ({
    bufferOrProgramDataAccount,
    currentAuthority,
    newAuthority,
}: {
    bufferOrProgramDataAccount: PublicKey;
    currentAuthority: PublicKey;
    newAuthority: PublicKey;
}) => {
    const upgradeIx = getSetAuthorityInstruction({
        bufferOrProgramDataAccount: bufferOrProgramDataAccount.toBase58() as Address,
        currentAuthority: currentAuthority.toBase58() as unknown as TransactionSigner,
        newAuthority: newAuthority.toBase58() as Address,
    });

    return new TransactionInstruction({
        keys: upgradeIx.accounts.map(v => ({
            isSigner: v.role === AccountRole.READONLY_SIGNER || v.role === AccountRole.WRITABLE_SIGNER,
            isWritable: v.role === AccountRole.WRITABLE_SIGNER || v.role === AccountRole.WRITABLE,
            pubkey: new PublicKey((v.address as any).publicKey ?? v.address),
        })),
        programId: new PublicKey(LOADER_V3_PROGRAM_ADDRESS),
        data: Buffer.from(upgradeIx.data),
    })
}

export const getUpgradeInstructionIx = ({
    programId,
    programDataPda,
    bufferAccount,
    spillAccount,
    authority,
}: {
    programId: PublicKey;
    programDataPda: PublicKey;
    bufferAccount: PublicKey;
    spillAccount: PublicKey;
    authority: PublicKey;
}) => {

    const upgradeIx = getUpgradeInstruction({
        programAccount: programId.toBase58() as Address,
        programDataAccount: programDataPda.toBase58() as Address,
        bufferAccount: bufferAccount.toBase58() as Address,
        spillAccount: spillAccount.toBase58() as Address,
        authority: authority.toBase58() as unknown as TransactionSigner,
    });

    return new TransactionInstruction({
        keys: upgradeIx.accounts.map(v => ({
            isSigner: v.role === AccountRole.READONLY_SIGNER || v.role === AccountRole.WRITABLE_SIGNER,
            isWritable: v.role === AccountRole.WRITABLE_SIGNER || v.role === AccountRole.WRITABLE,
            pubkey: new PublicKey((v.address as any).publicKey ?? v.address),
        })),
        programId: new PublicKey(LOADER_V3_PROGRAM_ADDRESS),
        data: Buffer.from(upgradeIx.data),
    })
}