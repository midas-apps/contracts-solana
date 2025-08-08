import { Cluster } from "@/common/addresses";
import { DeployDataFeedConfig } from "../common/data-feed";

export type DeploymentConfig = {
  genericConfigs: {
    // customAggregator?: DeployCustomAggregatorConfig;
  };
  networkConfigs: Partial<
    Record<
      Cluster,
      {
        dataFeed?: DeployDataFeedConfig;
        // dv?: DeployDvConfig;
      }
    >
  >;
};

// export type PaymentTokenDeploymentConfig = {
//   networkConfigs: Record<
//     number,
//     Partial<
//       Record<
//         PaymentTokenName,
//         {
//           dataFeed?: DeployDataFeedConfig;
//           customAggregator?: DeployCustomAggregatorConfig;
//         }
//       >
//     >
//   >;
// };

// export type NetworkDeploymentConfig = Record<
//   number,
//   {
//     grantDefaultAdminRole?: GrantDefaultAdminRoleToAcAdminConfig;
//   }
// >;
