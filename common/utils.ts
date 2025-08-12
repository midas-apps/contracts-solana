import { AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { getParams, Params } from './params';
import { MTokenName } from './types/tokens';
import { Network } from './types';

export type AnchorExtendedProvider = AnchorProvider &
  Params & {
    network: Network;
  };

export const executeAnchorScript = async (
  scriptFn: (
    provider: AnchorExtendedProvider,
    wallet: Keypair,
  ) => Promise<unknown>,
) => {
  const provider = AnchorProvider.env() as AnchorExtendedProvider;
  anchor.setProvider(provider);
  const payer = new Keypair((provider.wallet as any).payer._keypair);

  const params = getParams();
  const network = getNetwork(provider);

  provider.network = network;
  provider.mtoken = params.mtoken;
  provider.ptoken = params.ptoken;
  provider.amount = params.amount;

  try {
    await scriptFn(provider, payer);
  } catch (e) {
    console.error('ERROR! 🔴');
    console.error(e);
  }
};

export const getNetwork = (provider: AnchorExtendedProvider): Network => {
  const rpcUrl = provider.connection.rpcEndpoint;

  const network = rpcUrl.includes('devnet') ? 'devnet' : 'mainnet';
  console.warn(`Running on network ${network} with rpc url: ${rpcUrl}`);

  return network;
};
