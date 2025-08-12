import { getAmountOrThrow, getPaymentAndMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { mintInstant } from '../common/mint';

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const { mToken, pToken } = getPaymentAndMTokenOrThrow(provider);
    const amount = getAmountOrThrow(provider);
    return mintInstant({ provider, payer }, mToken, pToken, amount);
  });
};
main();
