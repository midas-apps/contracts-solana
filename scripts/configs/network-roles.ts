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
    accessControlAdminAddress: 'EfzamqVaGeuo2bVDJUophcChKD65tC52vQzSyrEEP3Fk',
  },
};
