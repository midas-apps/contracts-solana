import { createUserError } from "@/common/errorHandler";
import { getExtendProgramInstruction, getSetAuthorityInstruction, getUpgradeInstruction, LOADER_V3_PROGRAM_ADDRESS } from "@solana-program/loader-v3";
import { AccountRole, Address, TransactionSigner } from "@solana/kit";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";

export const getUpgradeAuthority = async (connection: Connection, programId: PublicKey): Promise<PublicKey | null> => {
    const [programDataPda] = PublicKey.findProgramAddressSync(
        [programId.toBuffer()],
        new PublicKey(LOADER_V3_PROGRAM_ADDRESS)
    );

    const accountInfo = await connection.getAccountInfo(programDataPda);

    if (!accountInfo) {
        throw createUserError(`No program data found for ${programId.toBase58()} at address ${programDataPda.toBase58()}`);
    }

    const data = accountInfo.data;

    // state discriminator
    const state = data.readUInt32LE(0);

    if (state !== 3) {
        throw new Error("Not a ProgramData account");
    }

    const option = data[12]; // 4 + 8

    let upgradeAuthority: PublicKey | null = null;

    if (option === 1) {
        upgradeAuthority = new PublicKey(data.slice(13, 45));
    }

    return upgradeAuthority;
}

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


export const getExtendProgramInstructionIx = ({
    programId,
    programDataPda,
    additionalBytes,
    payer
}: {
    programId: PublicKey;
    programDataPda: PublicKey;
    payer: PublicKey;
    additionalBytes: number;
}) => {
    const extendIx = getExtendProgramInstruction({
        programAccount: programId.toBase58() as Address,
        programDataAccount: programDataPda.toBase58() as Address,
        payer: payer.toBase58() as unknown as TransactionSigner,
        additionalBytes
    });

    return new TransactionInstruction({
        keys: extendIx.accounts.map(v => ({
            isSigner: v.role === AccountRole.READONLY_SIGNER || v.role === AccountRole.WRITABLE_SIGNER,
            isWritable: v.role === AccountRole.WRITABLE_SIGNER || v.role === AccountRole.WRITABLE,
            pubkey: new PublicKey((v.address as any).publicKey ?? v.address),
        })),
        programId: new PublicKey(LOADER_V3_PROGRAM_ADDRESS),
        data: Buffer.from(extendIx.data),
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