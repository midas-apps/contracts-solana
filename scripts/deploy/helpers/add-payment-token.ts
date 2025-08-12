import { PublicKey } from '@solana/web3.js';

import { getPaymentAndMTokenOrThrow } from '../common/utils';
import { MAX_U128 } from '@/test/constants/common.constants';
import { parsePercent } from '@/test/helpers/common.helpers';
import { addresses } from '@/common/addresses';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { addPaymentToken } from '../common/payment-token';
import { executeAnchorScript } from '@/common/utils';

// TODO: change config before execution
const config = {
  vaultCommon: addresses['devnet'].mTBILL.redeemer.commonVault,
  allowance: MAX_U128,
  fee: parsePercent(0.1),
  feed: addresses['devnet'].feeds['usdc'].dataFeed,
  mint: addresses['devnet'].feeds['usdc'].token,
  tokenProgram: TOKEN_PROGRAM_ID,
  stable: true,
  isFiat: false,
} as {
  mint: PublicKey;
  vaultCommon: PublicKey;
  feed: PublicKey;
  tokenProgram?: PublicKey;
  fee: bigint;
  allowance: bigint;
  stable: boolean;
  isFiat?: boolean;
};

export const main = async () => {
  await executeAnchorScript(async (provider, payer) => {
    const { mToken, pToken } = getPaymentAndMTokenOrThrow(provider);
    return addPaymentToken({ provider, payer }, mToken, pToken);
  });
};
main();
