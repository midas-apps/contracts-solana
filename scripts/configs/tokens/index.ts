import { MProduct } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

import { mTBILLConfig } from './mTBILL';
import { pSVConfig } from './pSV';
import { solmFONEConfig } from './solmFONE';
import { solmHYPERConfig } from './solmHYPER';

export const tokenConfigs: Partial<Record<MProduct, TokenConfigWithNetworks>> = {
  [MProduct.MTBILL]: mTBILLConfig,
  [MProduct.SOLMFONE]: solmFONEConfig,
  [MProduct.SOLMHYPER]: solmHYPERConfig,
  [MProduct.PSV]: pSVConfig,
};
