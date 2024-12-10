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
      "DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb"
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
