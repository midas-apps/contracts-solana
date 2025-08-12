import { getAmountOrThrow, getPaymentAndMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { redeemInstant } from '../common/redeem';

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const { mToken, pToken } = getPaymentAndMTokenOrThrow(provider);
    const amount = getAmountOrThrow(provider);
    return redeemInstant({ provider, payer }, mToken, pToken, amount);
  });
};
main();
