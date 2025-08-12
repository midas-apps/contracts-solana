import { getMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { grantRole } from '../common/ac';

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return grantRole({ provider, payer }, mToken);
  });
};
main();
