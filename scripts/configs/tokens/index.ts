import { MProduct } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

import { mFONEConfig } from './mFONE';
import { mTBILLConfig } from './mTBILL';
import { pSVConfig } from './pSV';

export const tokenConfigs: Partial<Record<MProduct, TokenConfigWithNetworks>> = {
  [MProduct.MTBILL]: mTBILLConfig,
  [MProduct.MFONE]: mFONEConfig,
  [MProduct.PSV]: pSVConfig,
};
