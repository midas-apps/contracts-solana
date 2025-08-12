import { getAmountOrThrow, getPaymentAndMTokenOrThrow } from '../common/utils';
import { executeAnchorScript } from '@/common/utils';
import { redeemRequestFiat } from '../common/redeem';

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const { mToken, pToken } = getPaymentAndMTokenOrThrow(provider);
    const amount = getAmountOrThrow(provider);
    return redeemRequestFiat({ provider, payer }, mToken, pToken, amount);
  });
};
main();
