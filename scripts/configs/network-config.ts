import { NetworkConfig } from "./types";

export const networkConfigs: NetworkConfig = {
  devnet: {
    timelock: {
      // 2 days
      delay: 2 * 86400,
      member: '77F5WP7E9PE3cRbUXGZ8W8S2zvSGvb2WS7QuVGYpavug',
    },
  },
  mainnet: {
    timelock: {
      // 2 days
      delay: 2 * 86400,
      member: '77F5WP7E9PE3cRbUXGZ8W8S2zvSGvb2WS7QuVGYpavug',
    },
  },
};