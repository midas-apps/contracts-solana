import { MProduct } from '@/common/tokenTypes';
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

import { mTBILLConfig } from './mTBILL';
import { pSVConfig } from './pSV';
import { solmFONEConfig } from './solmFONE';
import { solmHYPERConfig } from './solmHYPER';
import { solStockMarketTRBasisTradeConfig } from './solStockMarketTRBasisTrade';

export const tokenConfigs: Partial<Record<MProduct, TokenConfigWithNetworks>> = {
  [MProduct.mTBILL]: mTBILLConfig,
  [MProduct.solmFONE]: solmFONEConfig,
  [MProduct.solmHYPER]: solmHYPERConfig,
  [MProduct.pSV]: pSVConfig,
  [MProduct.solStockMarketTRBasisTrade]: solStockMarketTRBasisTradeConfig,
};
