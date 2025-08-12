import { getMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { AuthorityType } from '@solana/spl-token';
import { transferTokenAuthority } from '../common/token-authority';

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return transferTokenAuthority({ provider, payer }, mToken, {
      authorityType: AuthorityType.FreezeAccount,
    });
  });
};
main();
