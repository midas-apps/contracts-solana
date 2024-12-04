import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { DataFeedFixtureReturnType } from "../fixture/dafa-feed.fixture";
import {
  DataFeedMode,
  fetchDataFeedState,
  fetchManualFeedState,
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import {
  approveMint,
  approveMintInstruction,
  expectTxNotReverted,
  expectTxReverted,
  findATA,
  formatUnits,
  fromBN,
  getBalance,
  getOrCreateAta,
  OptionalCommonParams,
  parseUnits,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { VaultsFixtureReturnType } from "../fixture/vaults.fixture";
import {
  fetchMinterVaultRequestState,
  fetchMinterVaultState,
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
  getRedeemerVaultRequestPda,
  PaymentMint,
} from "../helpers/vaults.helpers";
import {
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MAX_U128 } from "../constants/common.constants";
import {
  addPaymentToken,
  newVaultCommonAccount,
} from "./common-vaults.testers";
import {
  fetchAccountAcState,
  getAccountAcRoleStatePda,
  getAccountAcStatePda,
} from "../helpers/ac.helpers";
import { newAccountAc } from "./ac.testers";
import { VAULT_AC_ROLES } from "../constants/vaults.constants";
import {
  fetchTokenAuthorityState,
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from "../helpers/token-authority.helpers";
import { TokenAuthorityFixtureReturnType } from "../fixture/token-authority.fixture";
import { TOKEN_AUTHORITY_ROLES } from "../constants/token-authority.constants";

type CommonTokenAuthorityParams = TokenAuthorityFixtureReturnType;

export const newTokenAuthority = async (
  fixture: CommonTokenAuthorityParams,
  {
    seed,
    acRole,
  }: {
    seed?: string;
    acRole?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { context, tokenAuthorityProgram, authority, acRoleMTbill } = fixture;
  const from = opt?.from ?? authority;

  seed ??= "mtbill-mint-authority";
  acRole ??= acRoleMTbill.publicKey;

  const fetchState = async () => {
    const tokenAuthority = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      getTokenAuthorityPda(seed),
      true
    );

    return {
      tokenAuthority,
    };
  };

  const stateBefore = await fetchState();

  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(
      Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))),
      acRole
    )
    .accountsPartial({
      signer: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(seed),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.tokenAuthority.acRole.equals(acRole)).toBe(true);
};

export const mintMToken = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    mToken,
    to,
    amount,
  }: {
    mToken?: PublicKey;
    to?: PublicKey;
    amount?: bigint;
  }
) => {
  mToken ??= fixture.mTBillMint.publicKey;
  to ??= fixture.authority.publicKey;
  amount ??= parseUnits("10");

  // TODO: pass optional from
  const from = fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mToken,
    to,
    from,
    TOKEN_2022_PROGRAM_ID
  );

  const minterState = await fetchTokenAuthorityState(
    fixture.tokenAuthorityProgram,
    getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed)
  );

  await processTransaction(
    fixture.context,

    await fixture.tokenAuthorityProgram.methods
      .mint(toBN(amount))
      .accountsPartial({
        mint: mToken,
        authority: fixture.authority.publicKey,
        tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
        receiver: to,
        receiverAta: ata,
        authorityMinterRole: getAccountAcRoleStatePda(
          minterState.acRole,
          fixture.authority.publicKey,
          TOKEN_AUTHORITY_ROLES.M_MINTER
        ),
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction(),
    [from]
  );
};
