export enum NetworkEnum {
  devnet = 'devnet',
  mainnet = 'mainnet',
}

export type Network = keyof typeof NetworkEnum;
