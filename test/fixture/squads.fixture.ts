import {
  AccountMeta,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import { LiteSVM } from 'litesvm';

import { DAY } from '../constants/common.constants';
import { SQUADS_PROGRAM_ID } from '../constants/squads.constant';
import { initLiteSVM, processTransaction } from '../helpers/common.helpers';

export function createMultisigCreateV2Instruction(
  accounts: multisig.generated.MultisigCreateV2InstructionAccounts,
  args: multisig.generated.MultisigCreateV2InstructionArgs,
) {
  const [data] = multisig.generated.multisigCreateV2Struct.serialize({
    instructionDiscriminator: multisig.generated.multisigCreateV2InstructionDiscriminator,
    ...args,
  });
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
  ];

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc);
    }
  }

  const ix = new TransactionInstruction({
    programId: multisig.PROGRAM_ID,
    keys,
    data,
  });
  return ix;
}

const createMultisig = async (
  context: LiteSVM,
  {
    authority,
    timelock = 2n * DAY,
    connection,
    member,
  }: {
    authority: Keypair;
    member?: PublicKey;
    timelock?: bigint;
    connection: any;
  },
) => {
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  const programConfigPda = multisig.getProgramConfigPda({})[0];

  const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(
    connection,
    programConfigPda,
  );

  const configTreasury = programConfig.treasury;

  await processTransaction(
    context,
    new Transaction().add(
      createMultisigCreateV2Instruction(
        {
          // Must sign the transaction, unless the .rpc method is used.
          createKey: createKey.publicKey,
          // The creator & fee payer
          creator: authority.publicKey,
          // The PDA of the multisig you are creating, derived by a random PublicKey
          multisig: multisigPda,
          // This is for the program config treasury account
          treasury: configTreasury,
          programConfig: programConfigPda,
        },
        {
          args: {
            configAuthority: null,
            threshold: 1,
            members: [
              {
                key: member ?? authority.publicKey,
                permissions: multisig.types.Permissions.all(),
              },
            ],
            timeLock: Number(timelock),
            rentCollector: null,
            memo: null,
          },
        },
      ),
    ),
    [authority, createKey],
  );

  return multisigPda as PublicKey;
};

export const squadsFixture = async (initSlot?: bigint) => {
  const { provider, context, accounts } = await initLiteSVM(10, initSlot, true);

  const [authority, ...regularAccounts] = accounts;

  const mockAccounts = [
    {
      data: Buffer.from(
        'xNJa55CVjD92Raz2HiWPdZHPcd7iP2i7V0ot8H6/wFdsT5Tc2zbKegAAAAAAAAAAPpPXMsRIJCeQ0tu1MaQKvRnxbFXjEyz/UnetydaTq1oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'base64',
      ),
      publicKey: new PublicKey('BSTq9w3kZwNwpBXJEvTZz2G9ZTNyKBvoSeXMvwb4cNZr'),
      owner: SQUADS_PROGRAM_ID,
    },
  ];

  for (const account of mockAccounts) {
    context.setAccount(account.publicKey, {
      data: account.data,
      owner: account.owner,
      lamports: 10000,
      executable: false,
    });
  }

  const multisigPda = await createMultisig(context, {
    authority,
    connection: provider.connection,
  });

  const multisigSignerPda = await createMultisig(context, {
    authority,
    connection: provider.connection,
    timelock: 0n,
  });

  const multisigWithSquadsSignerPda = await createMultisig(context, {
    authority,
    connection: provider.connection,
    member: multisigSignerPda,
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
        pda ?? multisigPda,
      );
    },
  };
};

export type SquadsFixtureReturnType = Awaited<ReturnType<typeof squadsFixture>>;
