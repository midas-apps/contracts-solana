import { DeployFunction, getMTokenOrThrow } from "../../common/utils";
import { deployMTokenDataFeed } from "./common/data-feed";

const func: DeployFunction = async (common, flags) => {
  const mToken = getMTokenOrThrow(flags);
  return deployMTokenDataFeed(common, mToken);
};

export default func;
