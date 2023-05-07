import { FastifyInstance } from "fastify";
import {
  callAnswerPath,
  callCreatePath,
  callIceCandidatePath,
} from "../../../libs/gpt-voice-api/src";
import cors from "@fastify/cors";
import { call, callAnswer, callIceCandidate } from "./controller/call";

export async function register(server: FastifyInstance) {
  await server.register(cors, { origin: true });

  server.post(convertOpenApiPathToFastifyPath(callCreatePath.path), call);
  server.put(convertOpenApiPathToFastifyPath(callAnswerPath.path), callAnswer);
  server.put(
    convertOpenApiPathToFastifyPath(callIceCandidatePath.path),
    callIceCandidate
  );
}

function convertOpenApiPathToFastifyPath(openApiPath: string): string {
  return openApiPath.replace(/{(.*?)}/g, ":$1");
}
