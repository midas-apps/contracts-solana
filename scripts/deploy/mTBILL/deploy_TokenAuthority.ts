import { parseUnits } from "../../../test/helpers/common.helpers";
import { deployDataFeed, DeployDataFeedConfig } from "../common/common";
import { PublicKey } from "@solana/web3.js";
import { executeAnchorScript } from "../../../common/utils";
import { addresses } from "@/common/addresses";
import {
  deployTokenAuthority,
  DeployTokenAuthorityConfig,
} from "../common/token-authority";

const configs: Record<string, DeployTokenAuthorityConfig> = {
  devnet: {
    acRole: addresses["devnet"].mTBILL!.acRole,
    seed: "mtbill-token-authority",
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deployTokenAuthority({ provider, payer }, configs["devnet"]);
  });
};

main();
