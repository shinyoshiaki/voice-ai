import { OpenApiBuilder } from "openapi3-ts/oas31";

import { callAnswerPath, callCreatePath, callIceCandidatePath } from "./type";

export const openapiJson = new OpenApiBuilder()
  .addInfo({ title: "gpt voice api", version: "0.0.1" })
  .addPath(callCreatePath.path, callCreatePath.item)
  .addPath(callIceCandidatePath.path, callIceCandidatePath.item)
  .addPath(callAnswerPath.path, callAnswerPath.item)
  .getSpecAsJson();
