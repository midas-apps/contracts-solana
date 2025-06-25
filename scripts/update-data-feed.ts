import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";

import { DeployFunction } from "../common/utils";
import { MAX_U128 } from "@/test/constants/common.constants";
import {
  createAtaIfNotExistsInx,
  parsePercent,
  toBN,
} from "@/test/helpers/common.helpers";
import { getVaultsProgram } from "./deploy/common/vaults";
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from "@/test/helpers/ac.helpers";
import { fetchVaultCommonState } from "@/test/helpers/vaults.helpers";
import { VAULT_AC_ROLES } from "@/test/constants/vaults.constants";
import { addresses } from "@/common/addresses";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getDataFeedProgram } from "./deploy/common/common";
import { DATA_FEED_AC_ROLES } from "@/test/constants/data-feed.constants";
import {
  DataFeedMode,
  fetchDataFeedState,
} from "@/test/helpers/data-feed.helpers";
import { getAcProgram } from "./deploy/common/ac";
import { AC_ROLES } from "@/test/constants/ac.constants";
import { getSwitchboardPullInx } from "./deploy/common/switchboard";

// TODO: change config before execution
const config = {
  dataFeed: addresses["devnet"].feeds.usdc.dataFeed,
  // newUnderlyingFeed: new PublicKey(
  //   "782zyJs63RQmYVHjUiNsP1xVxVtTkj12ZZcPobCRstkX"
  // ),
  newMaxStaleness: 5 * 60,
} as {
  newMaxStaleness: number | null;
  dataFeed: PublicKey;
  newUnderlyingFeed: PublicKey | null;
  newMode?: keyof typeof DataFeedMode;
};

const func: DeployFunction = async (provider, payer, _) => {
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);
  const state = await fetchDataFeedState(feedProgram, config.dataFeed);
  const tx = new Transaction().add(
    // // TODO: move to role grant
    // await acProgram.methods
    //   .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
    //   .accountsPartial({
    //     account: payer.publicKey,
    //     acRole: state.acRole,
    //     authority: payer.publicKey,
    //     authorityAcAdminRole: getAccountAcRoleStatePda(
    //       state.acRole,
    //       payer.publicKey,
    //       AC_ROLES.ADMIN
    //     ),
    //     accountAcRole: getAccountAcRoleStatePda(
    //       state.acRole,
    //       payer.publicKey,
    //       DATA_FEED_AC_ROLES.FEED_ADMIN
    //     ),
    //   })
    //   .instruction(),
    await feedProgram.methods
      .updateFeed(
        null,
        config.newUnderlyingFeed ?? null,
        config.newMode ? DataFeedMode[config.newMode] : null,
        null,
        null,
        config.newMaxStaleness ?? null
      )
      .accountsPartial({
        authority: payer.publicKey,
        feed: config.dataFeed,
        acRole: state.acRole,
        authorityAcRole: getAccountAcRoleStatePda(
          state.acRole,
          payer.publicKey,
          DATA_FEED_AC_ROLES.FEED_ADMIN
        ),
      })
      .instruction()
  );
  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer],
    {
      commitment: "finalized",
    }
  );
  console.log({ txRes });
};

export default func;
