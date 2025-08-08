import { DeployFunction } from "../../common/utils";
import { deployAcGlobal } from "./common/ac";

const func: DeployFunction = async (common, _flags) => {
  return deployAcGlobal(common, {});
};

export default func;
