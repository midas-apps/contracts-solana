import { MProduct } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

import { mTBILLConfig } from './mTBILL';

export const tokenConfigs: Partial<Record<MProduct, TokenConfigWithNetworks>> = {
  [MProduct.MTBILL]: mTBILLConfig,
};

export { mTBILLConfig };
