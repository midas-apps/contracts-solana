import { parseUnits } from "../../../test/helpers/common.helpers";
import { deployDataFeed, DeployDataFeedConfig } from "../common/common";
import { PublicKey } from "@solana/web3.js";
import { executeAnchorScript } from "../../../common/utils";
import { addresses } from "@/common/addresses";

const configs: Record<string, DeployDataFeedConfig> = {
  devnet: {
    acRole: addresses["devnet"].mTBILL!.acRole,
    maxPrice: parseUnits("100000"),
    minPrice: parseUnits("0.1"),
    mode: "switchboard",
    underlyingFeed: new PublicKey(
      "5GjQDcVcPwwMAzT6ZUjXgeVgRVM4UTvbpYieiBKuQi7f"
    ),
    maxStaleness: 86400,
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deployDataFeed({ provider, payer }, configs["devnet"]);
  });
};

main();
