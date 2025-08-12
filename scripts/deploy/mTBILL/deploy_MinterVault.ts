import { executeAnchorScript } from '../../../common/utils';
import { addresses } from '@/common/addresses';
import { deployMinterVault, DeployMinterVaultConfig } from '../common/vaults';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getMTokenOrThrow } from '../common/utils';

const configs: Record<string, DeployMinterVaultConfig> = {
  devnet: {
    acRole: addresses['devnet'].mTBILL!.acRole,
    ac: addresses['devnet'].ac,
    firstMintMinMTokens: parseUnits('10'),
    instantFee: parsePercent(1),
    greenListEnforced: false,
    instantDailyLimit: parseUnits('10000'),
    mTokenFeed: addresses['devnet'].mTBILL!.mTokenDataFeed,
    mToken: addresses['devnet'].mTBILL!.mToken,
    minAmount: parseUnits('1'),
    tokenAuthority: addresses['devnet'].mTBILL!.tokenAuthority!.account,
    variationTolerance: parsePercent(1),
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return deployMinterVault({ provider, payer }, mToken, 'dv');
  });
};

main();
