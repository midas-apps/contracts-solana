import { Address, getAddress } from "viem";
import { Network } from "./types";

export type SwitchboardConfig = {
  env: Network;
  ethRpc: string;
  ethDataFeed: Address;
};

export const switchboardConfigs: Record<Network, SwitchboardConfig> = {
  devnet: {
    env: "devnet",
    ethRpc: "https://ethereum-sepolia-rpc.publicnode.com",
    ethDataFeed: getAddress("0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E"),
  },
  mainnet: undefined,
};
