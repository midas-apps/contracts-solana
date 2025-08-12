import { getMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { PublicKey } from '@solana/web3.js';
import { updateDataFeed, UpdateDataFeedConfig } from '../common/feed';

const config: UpdateDataFeedConfig = {
  newUnderlyingFeed: new PublicKey(
    '782zyJs63RQmYVHjUiNsP1xVxVtTkj12ZZcPobCRstkX',
  ),
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const mToken = getMTokenOrThrow(provider);
    return updateDataFeed({ provider, payer }, mToken, config);
  });
};
main();
