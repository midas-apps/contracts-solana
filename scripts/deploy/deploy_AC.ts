import { addresses } from "@/common/addresses";
import { executeAnchorScript } from "../../common/utils";
import {
  deployAc,
  DeployAcConfig,
  deployAcRole,
  DeployAcRoleConfig,
} from "./common/ac";

const configs: Record<string, DeployAcConfig> = {
  devnet: {
    acRole: addresses["devnet"].acRoleGlobal,
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deployAc({ provider, payer }, configs["devnet"]);
  });
};

main();
