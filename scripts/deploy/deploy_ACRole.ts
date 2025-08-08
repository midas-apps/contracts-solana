import { DeployFunction } from "../../common/utils";
import { deployAcRoleGlobal } from "./common/ac";

const func: DeployFunction = async (common, _flags) => {
  return deployAcRoleGlobal(common, {});
};

export default func;
