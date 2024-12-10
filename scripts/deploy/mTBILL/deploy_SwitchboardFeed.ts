import { parseUnits } from "../../../test/helpers/common.helpers";
import { deployDataFeed, DeployDataFeedConfig } from "../common/common";
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
    ethDataFeed: getAddress("0xfCEE9754E8C375e145303b7cE7BEca3201734A2B"),
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deploySwitchboardFeed({ provider, payer }, configs["devnet"]);
  });
};

main();
