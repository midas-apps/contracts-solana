import { executeAnchorScript } from "../../../common/utils";
import { addresses } from "@/common/addresses";
import {
  deployRedeemerVault,
  DeployRedeemerVaultConfig,
} from "../common/vaults";
import { parsePercent, parseUnits } from "@/test/helpers/common.helpers";

const configs: Record<string, DeployRedeemerVaultConfig> = {
  devnet: {
    acRole: addresses["devnet"].mTBILL!.acRole,
    ac: addresses["devnet"].ac,
    instantFee: parsePercent(1),
    greenListEnforced: false,
    instantDailyLimit: parseUnits("10000"),
    mTokenFeed: addresses["devnet"].mTBILL!.mTokenDataFeed,
    mToken: addresses["devnet"].mTBILL!.mToken,
    minAmount: parseUnits("1"),
    variationTolerance: parsePercent(1),
    fiatFlatFee: parseUnits("1"),
    minFiatRedeemAmount: parseUnits("10"),
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    return deployRedeemerVault({ provider, payer }, "mTBILL", "rv");
  });
};

main();
