export enum MProduct {
  MTBILL = 'mTBILL',
  SOLMFONE = 'solmFONE',
  SOLMHYPER = 'solmHYPER',
  PSV = 'pSV',
}

export enum PaymentToken {
  USDC = 'USDC',
  USDT = 'USDT',
  wSOL = 'wSOL',
  USDG = 'USDG',
}

export function isMProduct(value: string): value is MProduct {
  return Object.values(MProduct).includes(value as MProduct);
}

export function isPaymentToken(value: string): value is PaymentToken {
  return Object.values(PaymentToken).includes(value as PaymentToken);
}
