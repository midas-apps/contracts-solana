import { executeAnchorScript } from '../../../common/utils';
import { addresses } from '@/common/addresses';
import {
  deployTokenAuthority,
  DeployTokenAuthorityConfig,
} from '../common/token-authority';
import { getMTokenOrThrow } from '../common/utils';

const configs: Record<string, DeployTokenAuthorityConfig> = {
  devnet: {
    acRole: addresses['devnet'].mTBILL!.acRole,
    seed: 'mtbill-token-authority',
  },
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return deployTokenAuthority({ provider, payer }, mToken);
  });
};

main();
