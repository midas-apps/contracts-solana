import { executeAnchorScript } from "../../common/utils";
import { deployAcRole, DeployAcRoleConfig } from "./common/ac";

const configs: Record<string, DeployAcRoleConfig> = {
  devnet: {},
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deployAcRole({ provider, payer });
  });
};

main();
