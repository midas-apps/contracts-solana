import { getMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { delegateToken, DelegateTokenConfig } from '../common/token-authority';
import { PublicKey } from '@solana/web3.js';

const config: DelegateTokenConfig = {
  mint: new PublicKey('FTRTWir5jXSekX1FDgXhg74Veoz3xq7MKX3pXKJt4y3e'),
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return delegateToken({ provider, payer }, mToken, config);
  });
};
main();
