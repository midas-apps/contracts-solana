import { Network, NetworkEnum } from './types';
import {
  MTokenName,
  MTokenNameEnum,
  PaymentTokenName,
  PaymentTokenNameEnum,
} from './types/tokens';

export const parseArgs = (args: string[]) => {
  const params = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];

      if (value && !value.startsWith('--')) {
        params[key] = value;
        i++;
      }
    }
  }

  return params as Params;
};

export const getParams = () => {
  const params = parseArgs(process.argv.slice(3));

  validateParams(params);

  return params;
};

export interface Params {
  mtoken?: MTokenName;
  ptoken?: PaymentTokenName;
  amount?: string;
}

export const validateParams = (params: Params) => {
  validateMToken(params.mtoken);
  validatePaymentToken(params.ptoken);
};

export const validateMToken = (mtoken: MTokenName) => {
  if (!mtoken) {
    return;
  }

  if (!Object.values(MTokenNameEnum).includes(mtoken as MTokenNameEnum)) {
    throw new Error(`Invalid mtoken: ${mtoken}`);
  }
};

export const validatePaymentToken = (ptoken: PaymentTokenName) => {
  if (!ptoken) {
    return;
  }

  if (
    !Object.values(PaymentTokenNameEnum).includes(
      ptoken as PaymentTokenNameEnum,
    )
  ) {
    throw new Error(`Invalid ptoken: ${ptoken}`);
  }
};
