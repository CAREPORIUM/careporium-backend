
import fs from "fs";
import YAML from "yaml";

const swaggerFile = fs.readFileSync(
    new URL("../docs/openapi.yaml", import.meta.url),
    "utf8"
);

const swaggerSpec = YAML.parse(swaggerFile);

export default swaggerSpec;