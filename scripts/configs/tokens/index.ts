import { MProduct } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

import { mTBILLConfig } from './mTBILL';
import { solmFONEConfig } from './solmFONE';

export const tokenConfigs: Partial<Record<MProduct, TokenConfigWithNetworks>> = {
  [MProduct.MTBILL]: mTBILLConfig,
  [MProduct.SOLMFONE]: solmFONEConfig,
};
