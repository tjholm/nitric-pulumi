import { LocalWorkspace } from "@pulumi/pulumi/automation";
import YAML from "yaml";
import * as fs from "fs";

export const getNitricYaml = () => {
  // read the nitric.yaml file
  return YAML.parse(fs.readFileSync("nitric.yaml").toString());
};

export const getNitricStack = async () => {
  const project = getNitricYaml();

  // Get the existing nitric stack
  return await LocalWorkspace.selectStack({
    projectName: project["name"],
    stackName: `${project["name"]}-aws`,
    // we're just reading the resources,
    // so no need to run updates
    program: null,
  });
};
