export interface NetworkRolesConfig {
  accessControlAdminAddress: string;
}

export const networkRolesConfigs: Record<string, NetworkRolesConfig> = {
  mainnet: {
    accessControlAdminAddress: 'HDBbVzHxAP3vHWnJkxxU99GfJr5NaxMZN8jj5oy2RGze',
  },
  devnet: {
    accessControlAdminAddress: 'HDBbVzHxAP3vHWnJkxxU99GfJr5NaxMZN8jj5oy2RGze',
  },
  localnet: {
    accessControlAdminAddress: 'DVUgvDTt56cNaQK7uEsnYpbyzGVNWtej8t2v9nVcdWmf',
  },
};
