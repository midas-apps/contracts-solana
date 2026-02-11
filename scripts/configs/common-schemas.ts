import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

export const publicKeySchema = z.string().refine(
  (val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid PublicKey format' },
);
