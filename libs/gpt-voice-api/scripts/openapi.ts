import { writeFile } from "fs";

import { openapiJson } from "../src";

writeFile("openapi.json", openapiJson, () => {});
