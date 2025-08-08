import { parseUnits } from "../../../test/helpers/common.helpers";
import { deployDataFeed, DeployDataFeedConfig } from "../common/data-feed";
import { PublicKey } from "@solana/web3.js";
import { executeAnchorScript } from "../../../common/utils";
import { addresses } from "@/common/addresses";
import {
  deploySwitchboardFeed,
  DeploySwitchboardFeedParams,
} from "../common/switchboard";
import { getAddress } from "viem";

const configs: Record<string, DeploySwitchboardFeedParams> = {
  devnet: {
    env: "devnet",
    ethRpc: "https://ethereum-sepolia-rpc.publicnode.com",
    ethDataFeed: getAddress("0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E"),
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deploySwitchboardFeed({ provider, payer }, configs["devnet"]);
  });
};

main();
